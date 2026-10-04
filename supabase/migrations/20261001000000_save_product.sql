-- Atomic product save.
--
-- Creates or updates a product and replaces its image rows in a single
-- transaction: either everything is written or nothing is.
--
-- Returns { id, removed_public_ids } so the caller can delete the
-- Cloudinary files of images that were removed, after the DB commit.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.save_product(
  p_product_id uuid,
  p_product jsonb,
  p_images jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_removed text[];
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_images is null or jsonb_array_length(p_images) = 0 then
    raise exception 'At least one product image is required';
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
      r.price, r.sku, r.is_active, r.inventory_policy
    from jsonb_populate_record(null::products, p_product) r
    returning id into v_id;
  else
    update products p set
      name             = r.name,
      slug             = r.slug,
      description      = r.description,
      category_id      = r.category_id,
      status           = r.status,
      width_mm         = r.width_mm,
      height_mm        = r.height_mm,
      length_mm        = r.length_mm,
      weight_grams     = r.weight_grams,
      price            = r.price,
      sku              = r.sku,
      is_active        = r.is_active,
      inventory_policy = r.inventory_policy,
      updated_at       = now()
    from jsonb_populate_record(null::products, p_product) r
    where p.id = p_product_id
    returning p.id into v_id;

    if v_id is null then
      raise exception 'Product not found';
    end if;
  end if;

  -- 2. Images that are no longer used (their Cloudinary files get deleted
  --    by the caller after this transaction commits) -----------------------

  select coalesce(array_agg(pi.cloudinary_public_id), '{}')
  into v_removed
  from product_images pi
  where pi.product_id = v_id
    and pi.cloudinary_public_id is not null
    and not exists (
      select 1
      from jsonb_array_elements(p_images) x
      where x->>'cloudinary_public_id' = pi.cloudinary_public_id
    );

  -- 3. Replace image rows; array position decides order and cover ----------

  delete from product_images where product_id = v_id;

  insert into product_images (
    product_id, url, cloudinary_public_id, alt_text, "order", is_primary
  )
  select
    v_id,
    x->>'url',
    x->>'cloudinary_public_id',
    x->>'alt_text',
    (t.ord - 1)::int,
    t.ord = 1
  from jsonb_array_elements(p_images) with ordinality as t(x, ord);

  return jsonb_build_object(
    'id', v_id,
    'removed_public_ids', to_jsonb(v_removed)
  );
end;
$$;

-- Only signed-in users may call it (and the function itself requires admin).
revoke execute on function public.save_product(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_product(uuid, jsonb, jsonb) to authenticated;
