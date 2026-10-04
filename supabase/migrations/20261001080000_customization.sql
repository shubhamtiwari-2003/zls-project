-- Custom products: fields the customer fills in (name text, photo, …).
--
--   product ── customization fields (e.g. "Name on keychain" text,
--              "Your photo" image), each with its own rules (config) and
--              price add-on (pricing). Rules are applied by the app
--              (src/lib/customization.ts), on the server for pricing.
--
--   Variants stay for fixed choices (size, colour). A line's price is
--   variant price + customization add-ons.
--
--   cart_items / order_items: one line per variant + customization, so two
--   keychains with different names are two lines.
--
--   customer_uploads: photos customers upload (private Cloudinary files).
--   'pending' until an order with them is paid, then 'ordered' (kept).

-- =========================================================================
-- 1. Customization fields
-- =========================================================================

create table if not exists public.product_customization_fields (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Stable name used in carts and orders ("name", "photo").
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label text not null check (length(trim(label)) between 1 and 80),
  type text not null check (type in ('text', 'image')),
  required boolean not null default true,
  help_text text check (help_text is null or length(help_text) <= 300),
  -- Type rules, e.g. { "maxLength": 12, "charset": "letters" }.
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  -- Price add-on, e.g. { "mode": "per_char", "rate": 25, "freeChars": 4 }.
  pricing jsonb not null default '{"mode": "none"}'::jsonb check (jsonb_typeof(pricing) = 'object'),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, key)
);

create index if not exists product_customization_fields_product_id_idx
  on public.product_customization_fields (product_id);

alter table public.product_customization_fields enable row level security;

drop policy if exists "Anyone reads product_customization_fields" on public.product_customization_fields;
create policy "Anyone reads product_customization_fields"
  on public.product_customization_fields for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins write product_customization_fields" on public.product_customization_fields;
create policy "Admins write product_customization_fields"
  on public.product_customization_fields for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke insert, update, delete on public.product_customization_fields from anon;

-- =========================================================================
-- 2. Customer uploads (written only by the server)
-- =========================================================================

create table if not exists public.customer_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cloudinary_public_id text not null unique,
  format text,
  width integer,
  height integer,
  bytes bigint,
  original_filename text,
  status text not null default 'pending' check (status in ('pending', 'ordered')),
  created_at timestamptz not null default now()
);

create index if not exists customer_uploads_user_id_idx on public.customer_uploads (user_id);
create index if not exists customer_uploads_pending_idx
  on public.customer_uploads (created_at) where status = 'pending';

alter table public.customer_uploads enable row level security;

drop policy if exists "Users read own uploads" on public.customer_uploads;
create policy "Users read own uploads"
  on public.customer_uploads for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.customer_uploads from anon, authenticated;

-- =========================================================================
-- 3. Cart lines: variant + customization
-- =========================================================================

alter table public.cart_items
  -- { fieldKey: text value | upload id }
  add column if not exists customization jsonb not null default '{}'::jsonb,
  -- Stable text form of `customization`; '' = none. Identifies the line.
  add column if not exists customization_key text not null default '';

alter table public.cart_items drop constraint if exists cart_items_customization_check;
alter table public.cart_items add constraint cart_items_customization_check check (
  jsonb_typeof(customization) = 'object'
  and pg_column_size(customization) <= 4000
  and length(customization_key) <= 2000
);

alter table public.cart_items drop constraint if exists cart_items_user_variant_key;
drop index if exists public.cart_items_user_variant_key;
create unique index if not exists cart_items_user_variant_custom_key
  on public.cart_items (user_id, variant_id, customization_key);

-- =========================================================================
-- 4. Order lines: frozen customization snapshot
-- =========================================================================
--
-- customization: [{ key, label, type, value, price, uploadId?, publicId?,
--                   width?, height?, format? }]  (null = not customised)
-- unit_price already includes the add-ons.

alter table public.order_items
  add column if not exists customization jsonb,
  add column if not exists customization_key text not null default '';

-- Paid lines leave the cart: match the customization too.
create or replace function public.clear_cart_after_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    delete from cart_items c
    using order_items oi
    where oi.order_id = new.id
      and c.user_id = new.user_id
      and c.variant_id = oi.variant_id
      and c.customization_key = oi.customization_key;
  end if;

  return new;
end;
$$;

-- Photos in a paid order are kept for good (never cleaned up).
create or replace function public.mark_uploads_ordered_after_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    update customer_uploads u
    set status = 'ordered'
    from order_items oi,
         jsonb_array_elements(coalesce(oi.customization, '[]'::jsonb)) f
    where oi.order_id = new.id
      and f->>'type' = 'image'
      and u.id::text = f->>'uploadId';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_mark_uploads_ordered on public.orders;
create trigger orders_mark_uploads_ordered
  after update of payment_status on public.orders
  for each row execute function public.mark_uploads_ordered_after_payment();

-- =========================================================================
-- 5. create_order(): order lines carry the customization
-- =========================================================================

create or replace function public.create_order(
  p_user_id uuid,
  p_address_id uuid,
  p_address jsonb,
  p_replaces_address_id uuid,
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

  select coalesce(sum((x->>'total_price')::bigint), 0)
  into v_items_total
  from jsonb_array_elements(p_items) x;

  if v_items_total <> p_subtotal or p_subtotal + p_shipping <> p_total then
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
    shipping_address_id, billing_address_id, payment_gateway
  )
  values (
    v_order_number, p_user_id, 'pending', 'unpaid',
    p_subtotal, p_shipping, 0, 0, p_total,
    v_address_id, v_address_id, 'razorpay'
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

-- =========================================================================
-- 6. Uploads that can be deleted (used by /api/uploads/cleanup)
-- =========================================================================
--
-- Pending, older than p_older_than, and not in any cart or in any order
-- that could still be paid or was paid.

create or replace function public.stale_customer_uploads(p_older_than interval)
returns table (id uuid, cloudinary_public_id text)
language sql
stable
security invoker
set search_path = public
as $$
  select u.id, u.cloudinary_public_id
  from customer_uploads u
  where u.status = 'pending'
    and u.created_at < now() - p_older_than
    and not exists (
      select 1
      from cart_items c, jsonb_each_text(c.customization) e
      where e.value = u.id::text
    )
    and not exists (
      select 1
      from order_items oi
      join orders o on o.id = oi.order_id,
      jsonb_array_elements(coalesce(oi.customization, '[]'::jsonb)) f
      where f->>'uploadId' = u.id::text
        and (o.canceled_at is null or o.payment_status = 'paid')
    );
$$;

revoke execute on function public.stale_customer_uploads(interval) from public, anon, authenticated;
grant execute on function public.stale_customer_uploads(interval) to service_role;

-- =========================================================================
-- 7. save_product(): also saves customization fields, same transaction
-- =========================================================================
--
-- The existing 5-argument function is kept as save_product_core() and
-- called from the new save_product(), so the product, images, variants
-- and fields are still written in one transaction.
--
-- p_customization_fields: [{ id?, key, label, type, required, help_text?,
--                            config, pricing }]   (array order = display order)

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_product'
      and pg_get_function_identity_arguments(p.oid) =
        'p_product_id uuid, p_product jsonb, p_images jsonb, p_options jsonb, p_variants jsonb'
  ) and not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_product_core'
  ) then
    alter function public.save_product(uuid, jsonb, jsonb, jsonb, jsonb) rename to save_product_core;
  end if;
end;
$$;

create or replace function public.save_product(
  p_product_id uuid,
  p_product jsonb,
  p_images jsonb,
  p_options jsonb,
  p_variants jsonb,
  p_customization_fields jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_result jsonb;
  v_id uuid;
  v_field jsonb;
  v_pos bigint;
  v_field_id uuid;
  v_kept uuid[] := '{}';
begin
  -- Checks admin, writes product/images/options/variants.
  v_result := public.save_product_core(p_product_id, p_product, p_images, p_options, p_variants);
  v_id := (v_result->>'id')::uuid;

  if jsonb_array_length(coalesce(p_customization_fields, '[]'::jsonb)) > 5 then
    raise exception 'A product can have at most 5 customization fields';
  end if;

  -- Keys may be swapped between fields in one save: clear them first.
  update product_customization_fields
  set key = 'tmp_' || substr(replace(id::text, '-', ''), 1, 30)
  where product_id = v_id;

  for v_field, v_pos in
    select x, ord
    from jsonb_array_elements(coalesce(p_customization_fields, '[]'::jsonb)) with ordinality as t(x, ord)
  loop
    v_field_id := null;

    if v_field->>'id' is not null then
      update product_customization_fields set
        key = v_field->>'key',
        label = trim(v_field->>'label'),
        type = v_field->>'type',
        required = coalesce((v_field->>'required')::boolean, true),
        help_text = nullif(trim(coalesce(v_field->>'help_text', '')), ''),
        config = coalesce(v_field->'config', '{}'::jsonb),
        pricing = coalesce(v_field->'pricing', '{"mode": "none"}'::jsonb),
        position = v_pos - 1,
        updated_at = now()
      where id = (v_field->>'id')::uuid and product_id = v_id
      returning id into v_field_id;
    end if;

    if v_field_id is null then
      insert into product_customization_fields (
        product_id, key, label, type, required, help_text, config, pricing, position
      )
      values (
        v_id,
        v_field->>'key',
        trim(v_field->>'label'),
        v_field->>'type',
        coalesce((v_field->>'required')::boolean, true),
        nullif(trim(coalesce(v_field->>'help_text', '')), ''),
        coalesce(v_field->'config', '{}'::jsonb),
        coalesce(v_field->'pricing', '{"mode": "none"}'::jsonb),
        v_pos - 1
      )
      returning id into v_field_id;
    end if;

    v_kept := v_kept || v_field_id;
  end loop;

  -- Orders keep a snapshot, so removed fields can simply be deleted.
  delete from product_customization_fields
  where product_id = v_id and not (id = any(v_kept));

  return v_result;
end;
$$;

revoke execute on function public.save_product(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_product(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- Called by save_product() (security invoker, so the caller needs it).
-- It checks is_admin() itself.
revoke execute on function public.save_product_core(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_product_core(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
