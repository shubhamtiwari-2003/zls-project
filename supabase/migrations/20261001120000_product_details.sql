-- Product details and MRP.
--
--   products.included_items     "What's in the box": [{ name, qty }]. Required
--                               when a product is saved (checked in
--                               save_product_core, so existing products and
--                               quick updates like on/off keep working).
--   products.highlights         ["Hand-finished", …]              optional
--   products.specifications     [{ label, value }]                optional
--   products.care_instructions  text                              optional
--
--   product_variants.compare_at_price   MRP / original price (display only;
--                               customers pay `price`). Must be above price.
--   products.compare_at_price   MRP of the cheapest variant, for listings.

alter table public.products
  add column if not exists included_items jsonb not null default '[]'::jsonb,
  add column if not exists highlights jsonb not null default '[]'::jsonb,
  add column if not exists specifications jsonb not null default '[]'::jsonb,
  add column if not exists care_instructions text,
  add column if not exists compare_at_price bigint;

alter table public.products drop constraint if exists products_details_shape_check;
alter table public.products add constraint products_details_shape_check check (
  jsonb_typeof(included_items) = 'array' and jsonb_array_length(included_items) <= 30
  and jsonb_typeof(highlights) = 'array' and jsonb_array_length(highlights) <= 12
  and jsonb_typeof(specifications) = 'array' and jsonb_array_length(specifications) <= 20
  and (care_instructions is null or length(care_instructions) <= 1000)
);

alter table public.product_variants
  add column if not exists compare_at_price bigint;

alter table public.product_variants drop constraint if exists product_variants_compare_at_check;
alter table public.product_variants add constraint product_variants_compare_at_check
  check (compare_at_price is null or compare_at_price > price);

-- =========================================================================
-- save_product_core(): the variants-migration version, plus the fields
-- above. (save_product() calls it and then saves customization fields.)
-- =========================================================================

create or replace function public.save_product_core(
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

  if jsonb_typeof(p_product->'included_items') is distinct from 'array'
     or jsonb_array_length(p_product->'included_items') = 0 then
    raise exception 'Add at least one item to "What''s in the box"';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_variants) x
    where nullif(x->>'compare_at_price', '') is not null
      and (x->>'compare_at_price')::bigint <= (x->>'price')::bigint
  ) then
    raise exception 'The MRP must be higher than the selling price';
  end if;

  -- 1. Product ------------------------------------------------------------

  if p_product_id is null then
    insert into products (
      name, slug, description, category_id, status,
      width_mm, height_mm, length_mm, weight_grams,
      price, sku, is_active, inventory_policy,
      included_items, highlights, specifications, care_instructions
    )
    select
      r.name, r.slug, r.description, r.category_id, r.status,
      r.width_mm, r.height_mm, r.length_mm, r.weight_grams,
      greatest(coalesce(r.price, 1), 1), r.sku, r.is_active, coalesce(r.inventory_policy, 'deny'),
      coalesce(r.included_items, '[]'::jsonb), coalesce(r.highlights, '[]'::jsonb),
      coalesce(r.specifications, '[]'::jsonb), nullif(trim(coalesce(r.care_instructions, '')), '')
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
      included_items    = coalesce(r.included_items, '[]'::jsonb),
      highlights        = coalesce(r.highlights, '[]'::jsonb),
      specifications    = coalesce(r.specifications, '[]'::jsonb),
      care_instructions = nullif(trim(coalesce(r.care_instructions, '')), ''),
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
        compare_at_price = nullif((nullif(v_var->>'compare_at_price', ''))::bigint, 0),
        sku = nullif(trim(v_var->>'sku'), ''),
        is_active = coalesce((v_var->>'is_active')::boolean, true),
        is_default = (v_value_count = 0),
        position = v_pos - 1,
        updated_at = now()
      where id = (v_var->>'id')::uuid and product_id = v_id
      returning id into v_var_id;
    end if;

    if v_var_id is null then
      insert into product_variants (product_id, price, compare_at_price, sku, is_active, is_default, position)
      values (
        v_id, v_price, nullif((nullif(v_var->>'compare_at_price', ''))::bigint, 0), nullif(trim(v_var->>'sku'), ''),
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
    compare_at_price = (
      select compare_at_price from product_variants
      where product_id = v_id and is_active
      order by price, position
      limit 1
    ),
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

revoke execute on function public.save_product_core(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_product_core(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
