-- Saved addresses without duplicates.
--
-- Rules:
--   * One row per distinct address per user (case-insensitive).
--   * Address rows are never edited. "Editing" creates a new row and
--     archives the old one, so past orders keep the address they shipped to.
--   * Only the server (create_order) writes addresses.

-- 1. Archive flag (archived = hidden from the checkout picker) -------------

alter table public.addresses
  add column if not exists archived_at timestamptz;

-- 2. Merge existing duplicates --------------------------------------------

create temp table address_dupes as
select
  id,
  first_value(id) over (
    partition by
      user_id, lower(full_name), coalesce(phone, ''), lower(line1),
      lower(coalesce(line2, '')), lower(city), lower(coalesce(state, '')), postal_code
    order by created_at
  ) as keeper_id
from public.addresses;

update public.orders o set shipping_address_id = d.keeper_id
from address_dupes d
where o.shipping_address_id = d.id and d.id <> d.keeper_id;

update public.orders o set billing_address_id = d.keeper_id
from address_dupes d
where o.billing_address_id = d.id and d.id <> d.keeper_id;

delete from public.addresses a
using address_dupes d
where a.id = d.id and d.id <> d.keeper_id;

drop table address_dupes;

-- 3. Enforce uniqueness -----------------------------------------------------

create unique index if not exists addresses_user_unique_idx
  on public.addresses (
    user_id, lower(full_name), coalesce(phone, ''), lower(line1),
    lower(coalesce(line2, '')), lower(city), lower(coalesce(state, '')), postal_code
  );

-- 4. Users can read their addresses; only the server writes them ----------

drop policy if exists "Users manage own addresses" on public.addresses;
drop policy if exists "Users read own addresses" on public.addresses;

create policy "Users read own addresses"
  on public.addresses for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.addresses from anon, authenticated;

-- 5. resolve_address(): reuse an identical address or create it -------------

create or replace function public.resolve_address(p_user_id uuid, p_address jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from addresses
  where user_id = p_user_id
    and lower(full_name) = lower(p_address->>'full_name')
    and coalesce(phone, '') = coalesce(p_address->>'phone', '')
    and lower(line1) = lower(p_address->>'line1')
    and lower(coalesce(line2, '')) = lower(coalesce(p_address->>'line2', ''))
    and lower(city) = lower(p_address->>'city')
    and lower(coalesce(state, '')) = lower(coalesce(p_address->>'state', ''))
    and postal_code = p_address->>'postal_code'
  limit 1;

  if v_id is not null then
    -- Same address again: bring it back to the picker and mark as recent.
    update addresses set archived_at = null, updated_at = now() where id = v_id;
    return v_id;
  end if;

  insert into addresses (
    user_id, full_name, phone, line1, line2, city, state, postal_code, country
  )
  values (
    p_user_id,
    p_address->>'full_name',
    p_address->>'phone',
    p_address->>'line1',
    nullif(p_address->>'line2', ''),
    p_address->>'city',
    p_address->>'state',
    p_address->>'postal_code',
    'IN'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.resolve_address(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.resolve_address(uuid, jsonb) to service_role;

-- 6. create_order(): saved address OR new/edited address --------------------

drop function if exists public.create_order(uuid, jsonb, jsonb, bigint, bigint, bigint);

create or replace function public.create_order(
  p_user_id uuid,
  p_address_id uuid,            -- use a saved address as-is
  p_address jsonb,              -- or: a new / edited address
  p_replaces_address_id uuid,   -- when editing: the saved address being replaced
  p_items jsonb,
  p_subtotal bigint,
  p_shipping bigint,
  p_total bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_address_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_items_total bigint;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order has no items';
  end if;

  -- Defence in depth: totals must add up.
  select coalesce(sum((x->>'total_price')::bigint), 0)
  into v_items_total
  from jsonb_array_elements(p_items) x;

  if v_items_total <> p_subtotal or p_subtotal + p_shipping <> p_total then
    raise exception 'Order totals do not add up';
  end if;

  -- Address ------------------------------------------------------------------

  if p_address_id is not null then
    select id into v_address_id
    from addresses
    where id = p_address_id and user_id = p_user_id and archived_at is null;

    if v_address_id is null then
      raise exception 'Saved address not found';
    end if;

    update addresses set updated_at = now() where id = v_address_id;
  else
    if p_address is null then
      raise exception 'Address is required';
    end if;

    v_address_id := public.resolve_address(p_user_id, p_address);

    -- Editing: hide the old version (orders that used it keep it).
    if p_replaces_address_id is not null and p_replaces_address_id <> v_address_id then
      update addresses
      set archived_at = now()
      where id = p_replaces_address_id and user_id = p_user_id;
    end if;
  end if;

  -- Order ----------------------------------------------------------------------

  v_order_number :=
    'ZLS-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' ||
    upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into orders (
    order_number, user_id, status, payment_status,
    subtotal_amount, shipping_amount, tax_amount, discount_amount, total_amount,
    shipping_address_id, billing_address_id, payment_gateway
  )
  values (
    v_order_number, p_user_id, 'pending', 'unpaid',
    p_subtotal, p_shipping, 0, 0, p_total,
    v_address_id, v_address_id, 'razorpay'
  )
  returning id into v_order_id;

  insert into order_items (
    order_id, product_id, product_name, sku, quantity, unit_price, total_price, tax
  )
  select
    v_order_id,
    (x->>'product_id')::uuid,
    x->>'product_name',
    x->>'sku',
    (x->>'quantity')::int,
    (x->>'unit_price')::bigint,
    (x->>'total_price')::bigint,
    0
  from jsonb_array_elements(p_items) x;

  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number);
end;
$$;

revoke execute on function public.create_order(uuid, uuid, jsonb, uuid, jsonb, bigint, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.create_order(uuid, uuid, jsonb, uuid, jsonb, bigint, bigint, bigint)
  to service_role;
