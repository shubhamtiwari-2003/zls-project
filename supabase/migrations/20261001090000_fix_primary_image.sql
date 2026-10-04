-- Fix: "duplicate key value violates unique constraint
-- one_primary_image_per_product" when the cover image changes.
--
-- save_product_core() sets is_primary image by image. When the cover moves
-- to another image (or a new image becomes the cover), the new cover is
-- marked primary while the old one still is, and the unique constraint
-- (one primary image per product) fails. Removed images are deleted only
-- after the loop, so a removed old cover hits the same problem.
--
-- Fix: clear the product's primary flag first. The loop then sets exactly
-- one image as primary. Same transaction, so a failed save changes nothing.

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
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  -- See the note at the top of this file.
  if p_product_id is not null then
    update product_images
    set is_primary = false
    where product_id = p_product_id and is_primary;
  end if;

  -- Writes product/images/options/variants.
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
