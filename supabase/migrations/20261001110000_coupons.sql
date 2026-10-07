-- Coupons.
--
--   coupons                 created in Admin → Coupons. Not readable by
--                           customers (codes would leak); the server looks
--                           them up with the service role.
--   orders.coupon_id/code   the coupon used; orders.discount_amount the
--                           rupees taken off.
--
-- Rules:
--   * percent (optionally capped by max_discount) or fixed ₹ off
--   * applies to the products subtotal, not shipping; free shipping is
--     decided on the subtotal BEFORE the discount
--   * an order always costs at least ₹1 (Razorpay minimum)
--   * a "use" = an order with the coupon that isn't cancelled (paid, or
--     unpaid and still waiting). Expired unpaid orders free the use.
--   * create_order() re-checks limits with the coupon row locked, so two
--     checkouts can't both take the last use.

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  -- Stored in capitals; customers can type any case.
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  description text check (description is null or length(description) <= 200),

  discount_type text not null check (discount_type in ('percent', 'fixed')),
  -- percent: 1–100; fixed: rupees.
  discount_value integer not null check (discount_value > 0),
  -- Cap for percent coupons, in rupees (null = no cap).
  max_discount integer check (max_discount is null or max_discount > 0),
  min_order_amount integer not null default 0 check (min_order_amount >= 0),

  starts_at timestamptz,
  expires_at timestamptz,
  -- null = unlimited.
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_user_limit integer default 1 check (per_user_limit is null or per_user_limit > 0),

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint coupons_percent_check check (discount_type <> 'percent' or discount_value <= 100),
  constraint coupons_dates_check check (starts_at is null or expires_at is null or starts_at < expires_at)
);

alter table public.coupons enable row level security;

drop policy if exists "Admins manage coupons" on public.coupons;
create policy "Admins manage coupons"
  on public.coupons for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.coupons from anon;

create or replace function public.touch_coupon()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.code := upper(trim(new.code));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists coupons_touch on public.coupons;
create trigger coupons_touch
  before insert or update on public.coupons
  for each row execute function public.touch_coupon();

-- Orders remember the coupon (kept even if the coupon is deleted).
alter table public.orders
  add column if not exists coupon_id uuid references public.coupons (id) on delete set null,
  add column if not exists coupon_code text;

create index if not exists orders_coupon_id_idx on public.orders (coupon_id) where coupon_id is not null;

-- Coupons that were used can't be deleted from the admin (only switched
-- off), so order history and usage counts stay meaningful.
create or replace function public.prevent_used_coupon_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from orders where coupon_id = old.id) then
    raise exception 'This coupon has been used. Switch it off instead of deleting it.';
  end if;
  return old;
end;
$$;

drop trigger if exists coupons_prevent_used_delete on public.coupons;
create trigger coupons_prevent_used_delete
  before delete on public.coupons
  for each row execute function public.prevent_used_coupon_delete();

-- Uses of each coupon (paid + waiting for payment), for the admin list.
create or replace function public.coupon_usage()
returns table (coupon_id uuid, uses bigint, paid_uses bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select o.coupon_id,
         count(*) filter (where o.status <> 'canceled'),
         count(*) filter (where o.payment_status = 'paid')
  from orders o
  where o.coupon_id is not null
  group by o.coupon_id;
$$;

-- =========================================================================
-- create_order(): with an optional coupon
-- =========================================================================

drop function if exists public.create_order(uuid, uuid, jsonb, uuid, jsonb, bigint, bigint, bigint);

create or replace function public.create_order(
  p_user_id uuid,
  p_address_id uuid,
  p_address jsonb,
  p_replaces_address_id uuid,
  p_items jsonb,
  p_subtotal bigint,
  p_shipping bigint,
  p_total bigint,
  p_coupon_id uuid default null,
  p_discount bigint default 0
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
  v_coupon coupons%rowtype;
  v_uses bigint;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order has no items';
  end if;

  select coalesce(sum((x->>'total_price')::bigint), 0)
  into v_items_total
  from jsonb_array_elements(p_items) x;

  if coalesce(p_discount, 0) < 0 or coalesce(p_discount, 0) >= p_subtotal + p_shipping then
    raise exception 'Order totals do not add up';
  end if;

  if v_items_total <> p_subtotal or p_subtotal - coalesce(p_discount, 0) + p_shipping <> p_total then
    raise exception 'Order totals do not add up';
  end if;

  -- Coupon: re-checked here with the row locked (limits can't be raced).
  if p_coupon_id is not null then
    select * into v_coupon from coupons where id = p_coupon_id for update;

    if not found or not v_coupon.is_active
       or (v_coupon.starts_at is not null and now() < v_coupon.starts_at)
       or (v_coupon.expires_at is not null and now() >= v_coupon.expires_at) then
      raise exception 'Coupon is no longer valid';
    end if;

    if p_subtotal < v_coupon.min_order_amount then
      raise exception 'Coupon is no longer valid';
    end if;

    if v_coupon.usage_limit is not null then
      select count(*) into v_uses from orders where coupon_id = p_coupon_id and status <> 'canceled';
      if v_uses >= v_coupon.usage_limit then
        raise exception 'Coupon usage limit reached';
      end if;
    end if;

    if v_coupon.per_user_limit is not null then
      select count(*) into v_uses
      from orders
      where coupon_id = p_coupon_id and user_id = p_user_id and status <> 'canceled';
      if v_uses >= v_coupon.per_user_limit then
        raise exception 'Coupon usage limit reached';
      end if;
    end if;
  elsif coalesce(p_discount, 0) <> 0 then
    raise exception 'Order totals do not add up';
  end if;

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

    if p_replaces_address_id is not null and p_replaces_address_id <> v_address_id then
      update addresses
      set archived_at = now()
      where id = p_replaces_address_id and user_id = p_user_id;
    end if;
  end if;

  v_order_number :=
    'ZLS-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' ||
    upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into orders (
    order_number, user_id, status, payment_status,
    subtotal_amount, shipping_amount, tax_amount, discount_amount, total_amount,
    shipping_address_id, billing_address_id, payment_gateway,
    coupon_id, coupon_code
  )
  values (
    v_order_number, p_user_id, 'pending', 'unpaid',
    p_subtotal, p_shipping, 0, coalesce(p_discount, 0), p_total,
    v_address_id, v_address_id, 'razorpay',
    p_coupon_id, case when p_coupon_id is not null then v_coupon.code end
  )
  returning id into v_order_id;

  insert into order_items (
    order_id, product_id, variant_id, product_name, variant_title, image_url,
    sku, quantity, unit_price, total_price, tax, customization, customization_key
  )
  select
    v_order_id,
    (x->>'product_id')::uuid,
    (x->>'variant_id')::uuid,
    x->>'product_name',
    nullif(x->>'variant_title', ''),
    x->>'image_url',
    x->>'sku',
    (x->>'quantity')::int,
    (x->>'unit_price')::bigint,
    (x->>'total_price')::bigint,
    0,
    case when jsonb_typeof(x->'customization') = 'array' then x->'customization' end,
    coalesce(x->>'customization_key', '')
  from jsonb_array_elements(p_items) x;

  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number);
end;
$$;

revoke execute on function public.create_order(uuid, uuid, jsonb, uuid, jsonb, bigint, bigint, bigint, uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.create_order(uuid, uuid, jsonb, uuid, jsonb, bigint, bigint, bigint, uuid, bigint)
  to service_role;
