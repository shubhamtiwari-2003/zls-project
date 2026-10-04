-- Product variants.
--
--   product ── options (≤3, e.g. Size, Design)
--          │     └─ values (A4, A3 / Batman, Spiderman)
--          │          └─ image_id → one of the product's images (for the
--          │             option that changes the look, e.g. Design)
--          └─ variants = one combination of values; the thing that is bought.
--               own price, SKU, stock (inventory), active flag
--
--   * Every product has at least one variant. A product without options has
--     one "default" variant (is_default = true, no values).
--   * Stock, carts, reservations and order lines are per variant.
--   * products.price = lowest active variant price ("From ₹…" in listings),
--     products.sku = first active variant's SKU. Kept up to date by
--     save_product().
--   * Variants that were ordered are never deleted, only deactivated.

-- =========================================================================
-- 1. Tables
-- =========================================================================

create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 50),
  position integer not null default 0,
  -- The option whose values change the product image (e.g. Design).
  is_visual boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_options_product_id_idx on public.product_options (product_id);

create table if not exists public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.product_options (id) on delete cascade,
  value text not null check (length(trim(value)) between 1 and 50),
  position integer not null default 0,
  image_id uuid references public.product_images (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists product_option_values_option_id_idx on public.product_option_values (option_id);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- "Batman · A3"; empty for a default variant.
  title text not null default '',
  sku text,
  price bigint not null check (price > 0),
  is_active boolean not null default true,
  is_default boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx on public.product_variants (product_id);
create unique index if not exists product_variants_sku_key
  on public.product_variants (sku) where sku is not null;

create table if not exists public.variant_option_values (
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  option_value_id uuid not null references public.product_option_values (id) on delete cascade,
  primary key (variant_id, option_value_id)
);

-- =========================================================================
-- 2. A default variant for every existing product
-- =========================================================================

insert into public.product_variants (product_id, title, sku, price, is_active, is_default, position)
select p.id, '', p.sku, greatest(p.price, 1), true, true, 0
from public.products p
where not exists (select 1 from public.product_variants v where v.product_id = p.id);

-- =========================================================================
-- 3. Inventory per variant
-- =========================================================================

alter table public.inventory
  add column if not exists variant_id uuid references public.product_variants (id) on delete cascade;

update public.inventory i
set variant_id = v.id
from public.product_variants v
where v.product_id = i.product_id and v.is_default and i.variant_id is null;

delete from public.inventory where variant_id is null;

-- One row per product is no longer true. The old uniqueness may exist as a
-- constraint (original schema) or as an index (inventory migration).
alter table public.inventory drop constraint if exists inventory_product_id_key;
drop index if exists public.inventory_product_id_key;
create unique index if not exists inventory_variant_id_key on public.inventory (variant_id);
create index if not exists inventory_product_id_idx on public.inventory (product_id);

insert into public.inventory (product_id, variant_id, stock_available)
select v.product_id, v.id, 1
from public.product_variants v
where not exists (select 1 from public.inventory i where i.variant_id = v.id);

alter table public.inventory alter column variant_id set not null;

-- New variants start with stock 1 (replaces the per-product trigger).
drop trigger if exists products_create_inventory on public.products;
drop function if exists public.create_inventory_for_product();

create or replace function public.create_inventory_for_variant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into inventory (product_id, variant_id, stock_available)
  values (new.product_id, new.id, 1)
  on conflict (variant_id) do nothing;
  return new;
end;
$$;

drop trigger if exists product_variants_create_inventory on public.product_variants;
create trigger product_variants_create_inventory
  after insert on public.product_variants
  for each row execute function public.create_inventory_for_variant();

-- =========================================================================
-- 4. Cart items per variant
-- =========================================================================

alter table public.cart_items
  add column if not exists variant_id uuid references public.product_variants (id) on delete cascade;

update public.cart_items c
set variant_id = v.id
from public.product_variants v
where v.product_id = c.product_id and v.is_default and c.variant_id is null;

delete from public.cart_items where variant_id is null;

alter table public.cart_items alter column variant_id set not null;

alter table public.cart_items drop constraint if exists cart_items_user_product_key;
drop index if exists public.cart_items_user_product_key;
create unique index if not exists cart_items_user_variant_key
  on public.cart_items (user_id, variant_id);

-- Price (and product) come from the variant, never from the browser.
create or replace function public.set_cart_item_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select price, product_id into new.unit_price, new.product_id
  from product_variants
  where id = new.variant_id;

  if new.unit_price is null then
    raise exception 'Variant not found';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- =========================================================================
-- 5. Order items per variant
-- =========================================================================

alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants (id) on delete restrict,
  add column if not exists variant_title text,
  add column if not exists image_url text;

update public.order_items oi
set variant_id = v.id
from public.product_variants v
where v.product_id = oi.product_id and v.is_default and oi.variant_id is null;

-- =========================================================================
-- 6. RLS: anyone can read the catalog, admins write (through save_product)
-- =========================================================================

alter table public.product_options enable row level security;
alter table public.product_option_values enable row level security;
alter table public.product_variants enable row level security;
alter table public.variant_option_values enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['product_options', 'product_option_values', 'product_variants', 'variant_option_values']
  loop
    execute format('drop policy if exists "Anyone reads %1$s" on public.%1$I', t);
    execute format(
      'create policy "Anyone reads %1$s" on public.%1$I for select to anon, authenticated using (true)', t);

    execute format('drop policy if exists "Admins write %1$s" on public.%1$I', t);
    execute format(
      'create policy "Admins write %1$s" on public.%1$I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t);

    execute format('revoke insert, update, delete on public.%I from anon', t);
  end loop;
end;
$$;

-- =========================================================================
-- 7. Stock reservation / payment / cart cleanup by variant
-- =========================================================================

create or replace function public.reserve_stock_for_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy text;
  v_updated integer;
begin
  if new.variant_id is null then
    raise exception 'Order item has no variant';
  end if;

  select inventory_policy into v_policy from products where id = new.product_id;

  if coalesce(v_policy, 'deny') = 'deny' then
    -- Row lock + condition: two checkouts can't both take the last unit.
    update inventory
    set stock_reserved = stock_reserved + new.quantity,
        updated_at = now()
    where variant_id = new.variant_id
      and stock_available - stock_reserved >= new.quantity;

    get diagnostics v_updated = row_count;

    if v_updated = 0 then
      raise exception 'Insufficient stock for %',
        coalesce(new.product_name, new.product_id::text) ||
        coalesce(' (' || nullif(new.variant_title, '') || ')', '');
    end if;
  else
    update inventory
    set stock_reserved = stock_reserved + new.quantity,
        updated_at = now()
    where variant_id = new.variant_id;
  end if;

  update orders set stock_reserved = true where id = new.order_id;

  return new;
end;
$$;

create or replace function public.release_order_stock(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update inventory i
  set stock_reserved = greatest(i.stock_reserved - oi.quantity, 0),
      updated_at = now()
  from (
    select variant_id, sum(quantity)::int as quantity
    from order_items
    where order_id = p_order_id
    group by variant_id
  ) oi
  where i.variant_id = oi.variant_id;

  update orders set stock_reserved = false where id = p_order_id;
end;
$$;

create or replace function public.mark_order_paid(
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_amount_paise bigint
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order
  from orders
  where razorpay_order_id = p_razorpay_order_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if v_order.payment_status = 'paid' then
    return 'already_paid';
  end if;

  if p_amount_paise is not null and p_amount_paise <> v_order.total_amount * 100 then
    return 'amount_mismatch';
  end if;

  update inventory i
  set stock_available = i.stock_available - oi.quantity,
      stock_reserved = case
        when v_order.stock_reserved then greatest(i.stock_reserved - oi.quantity, 0)
        else i.stock_reserved
      end,
      updated_at = now()
  from (
    select variant_id, sum(quantity)::int as quantity
    from order_items
    where order_id = v_order.id
    group by variant_id
  ) oi
  where i.variant_id = oi.variant_id;

  update orders
  set payment_status = 'paid',
      status = 'confirmed',
      stock_reserved = false,
      canceled_at = null,
      razorpay_payment_id = p_razorpay_payment_id,
      paid_at = now()
  where id = v_order.id;

  return 'paid';
end;
$$;

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
      and c.variant_id = oi.variant_id;
  end if;

  return new;
end;
$$;

-- =========================================================================
-- 8. create_order(): order lines carry the variant
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
    sku, quantity, unit_price, total_price, tax
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
    0
  from jsonb_array_elements(p_items) x;

  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number);
end;
$$;

-- =========================================================================
-- 9. save_product(): product + images + options + variants, one transaction
-- =========================================================================
--
-- p_images:   [{ key, id?, url, cloudinary_public_id?, alt_text? }]   (array order = display order)
-- p_options:  [{ id?, name, is_visual, values: [{ key, id?, value, image_key? }] }]
-- p_variants: [{ id?, value_keys: [valueKey…], price, sku?, is_active }]
--
-- `key` lets the browser refer to images/values that don't have an ID yet:
-- existing rows use their ID as key, new ones a temporary key.
-- Existing images keep their IDs, so option value → image links survive edits.

drop function if exists public.save_product(uuid, jsonb, jsonb);

create or replace function public.save_product(
  p_product_id uuid,
  p_product jsonb,
  p_images jsonb,
  p_options jsonb,
  p_variants jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_removed text[];
  v_image_ids jsonb := '{}'::jsonb;
  v_value_ids jsonb := '{}'::jsonb;
  v_kept_images uuid[] := '{}';
  v_kept_options uuid[] := '{}';
  v_kept_values uuid[] := '{}';
  v_kept_variants uuid[] := '{}';
  v_img jsonb;
  v_opt jsonb;
  v_val jsonb;
  v_var jsonb;
  v_pos bigint;
  v_vpos bigint;
  v_img_id uuid;
  v_opt_id uuid;
  v_val_id uuid;
  v_var_id uuid;
  v_price bigint;
  v_value_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_images is null or jsonb_array_length(p_images) = 0 then
    raise exception 'At least one product image is required';
  end if;

  if p_variants is null or jsonb_array_length(p_variants) = 0 then
    raise exception 'At least one variant is required';
  end if;

  if jsonb_array_length(coalesce(p_options, '[]'::jsonb)) > 3 then
    raise exception 'A product can have at most 3 options';
  end if;

  -- 1. Product ------------------------------------------------------------

  if p_product_id is null then
    insert into products (
      name, slug, description, category_id, status,
      width_mm, height_mm, length_mm, weight_grams,
      price, sku, is_active, inventory_policy
    )
    select
      r.name, r.slug, r.description, r.category_id, r.status,
      r.width_mm, r.height_mm, r.length_mm, r.weight_grams,
      greatest(coalesce(r.price, 1), 1), r.sku, r.is_active, coalesce(r.inventory_policy, 'deny')
    from jsonb_populate_record(null::products, p_product) r
    returning id into v_id;
  else
    update products p set
      name         = r.name,
      slug         = r.slug,
      description  = r.description,
      category_id  = r.category_id,
      status       = r.status,
      width_mm     = r.width_mm,
      height_mm    = r.height_mm,
      length_mm    = r.length_mm,
      weight_grams = r.weight_grams,
      is_active    = r.is_active,
      updated_at   = now()
    from jsonb_populate_record(null::products, p_product) r
    where p.id = p_product_id
    returning p.id into v_id;

    if v_id is null then
      raise exception 'Product not found';
    end if;
  end if;

  -- 2. Images: update existing (IDs stay), insert new, delete removed ------

  for v_img, v_pos in
    select x, ord from jsonb_array_elements(p_images) with ordinality as t(x, ord)
  loop
    v_img_id := null;

    if v_img->>'id' is not null then
      update product_images set
        url = v_img->>'url',
        cloudinary_public_id = v_img->>'cloudinary_public_id',
        alt_text = v_img->>'alt_text',
        "order" = v_pos - 1,
        is_primary = (v_pos = 1)
      where id = (v_img->>'id')::uuid and product_id = v_id
      returning id into v_img_id;
    end if;

    if v_img_id is null then
      insert into product_images (product_id, url, cloudinary_public_id, alt_text, "order", is_primary)
      values (v_id, v_img->>'url', v_img->>'cloudinary_public_id', v_img->>'alt_text', v_pos - 1, v_pos = 1)
      returning id into v_img_id;
    end if;

    v_kept_images := v_kept_images || v_img_id;
    v_image_ids := v_image_ids || jsonb_build_object(v_img->>'key', v_img_id);
  end loop;

  -- Cloudinary files of removed images (deleted by the caller after commit).
  select coalesce(array_agg(pi.cloudinary_public_id), '{}')
  into v_removed
  from product_images pi
  where pi.product_id = v_id
    and not (pi.id = any(v_kept_images))
    and pi.cloudinary_public_id is not null
    and not exists (
      select 1 from product_images k
      where k.id = any(v_kept_images) and k.cloudinary_public_id = pi.cloudinary_public_id
    );

  delete from product_images where product_id = v_id and not (id = any(v_kept_images));

  -- 3. Options and values ---------------------------------------------------

  for v_opt, v_pos in
    select x, ord from jsonb_array_elements(coalesce(p_options, '[]'::jsonb)) with ordinality as t(x, ord)
  loop
    v_opt_id := null;

    if v_opt->>'id' is not null then
      update product_options set
        name = trim(v_opt->>'name'),
        position = v_pos - 1,
        is_visual = coalesce((v_opt->>'is_visual')::boolean, false)
      where id = (v_opt->>'id')::uuid and product_id = v_id
      returning id into v_opt_id;
    end if;

    if v_opt_id is null then
      insert into product_options (product_id, name, position, is_visual)
      values (v_id, trim(v_opt->>'name'), v_pos - 1, coalesce((v_opt->>'is_visual')::boolean, false))
      returning id into v_opt_id;
    end if;

    v_kept_options := v_kept_options || v_opt_id;

    if jsonb_array_length(coalesce(v_opt->'values', '[]'::jsonb)) = 0 then
      raise exception 'Option "%" needs at least one value', v_opt->>'name';
    end if;

    for v_val, v_vpos in
      select x, ord from jsonb_array_elements(v_opt->'values') with ordinality as t(x, ord)
    loop
      v_val_id := null;

      if v_val->>'id' is not null then
        update product_option_values set
          option_id = v_opt_id,
          value = trim(v_val->>'value'),
          position = v_vpos - 1,
          image_id = (v_image_ids->>(v_val->>'image_key'))::uuid
        where id = (v_val->>'id')::uuid
          and option_id in (select id from product_options where product_id = v_id)
        returning id into v_val_id;
      end if;

      if v_val_id is null then
        insert into product_option_values (option_id, value, position, image_id)
        values (v_opt_id, trim(v_val->>'value'), v_vpos - 1, (v_image_ids->>(v_val->>'image_key'))::uuid)
        returning id into v_val_id;
      end if;

      v_kept_values := v_kept_values || v_val_id;
      v_value_ids := v_value_ids || jsonb_build_object(v_val->>'key', v_val_id);
    end loop;
  end loop;

  -- 4. Variants -------------------------------------------------------------

  for v_var, v_pos in
    select x, ord from jsonb_array_elements(p_variants) with ordinality as t(x, ord)
  loop
    v_var_id := null;
    v_price := (v_var->>'price')::bigint;
    v_value_count := jsonb_array_length(coalesce(v_var->'value_keys', '[]'::jsonb));

    if v_price is null or v_price <= 0 then
      raise exception 'Every variant needs a price above 0';
    end if;

    if v_var->>'id' is not null then
      update product_variants set
        price = v_price,
        sku = nullif(trim(v_var->>'sku'), ''),
        is_active = coalesce((v_var->>'is_active')::boolean, true),
        is_default = (v_value_count = 0),
        position = v_pos - 1,
        updated_at = now()
      where id = (v_var->>'id')::uuid and product_id = v_id
      returning id into v_var_id;
    end if;

    if v_var_id is null then
      insert into product_variants (product_id, price, sku, is_active, is_default, position)
      values (
        v_id, v_price, nullif(trim(v_var->>'sku'), ''),
        coalesce((v_var->>'is_active')::boolean, true), v_value_count = 0, v_pos - 1
      )
      returning id into v_var_id;
    end if;

    v_kept_variants := v_kept_variants || v_var_id;

    delete from variant_option_values where variant_id = v_var_id;

    insert into variant_option_values (variant_id, option_value_id)
    select v_var_id, (v_value_ids->>k)::uuid
    from jsonb_array_elements_text(coalesce(v_var->'value_keys', '[]'::jsonb)) k;

    update product_variants set title = coalesce((
      select string_agg(pov.value, ' · ' order by po.position)
      from variant_option_values vov
      join product_option_values pov on pov.id = vov.option_value_id
      join product_options po on po.id = pov.option_id
      where vov.variant_id = v_var_id
    ), '')
    where id = v_var_id;
  end loop;

  -- 5. Remove what's no longer in the product --------------------------------

  -- Ordered variants are kept (orders reference them) but hidden.
  update product_variants v set is_active = false, updated_at = now()
  where v.product_id = v_id
    and not (v.id = any(v_kept_variants))
    and exists (select 1 from order_items oi where oi.variant_id = v.id);

  delete from product_variants v
  where v.product_id = v_id
    and not (v.id = any(v_kept_variants))
    and not exists (select 1 from order_items oi where oi.variant_id = v.id);

  delete from product_option_values
  where option_id in (select id from product_options where product_id = v_id)
    and not (id = any(v_kept_values));

  delete from product_options where product_id = v_id and not (id = any(v_kept_options));

  if not exists (select 1 from product_variants where product_id = v_id and is_active) then
    raise exception 'At least one variant must be active';
  end if;

  -- 6. Listing price ("From ₹…") and SKU ------------------------------------

  update products set
    price = (select min(price) from product_variants where product_id = v_id and is_active),
    sku = (
      select sku from product_variants
      where product_id = v_id and is_active
      order by position
      limit 1
    )
  where id = v_id;

  return jsonb_build_object(
    'id', v_id,
    'removed_public_ids', to_jsonb(v_removed)
  );
end;
$$;

revoke execute on function public.save_product(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_product(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
