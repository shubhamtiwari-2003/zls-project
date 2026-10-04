import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { purchasableStock, type InventoryJoin } from "@/lib/stock";
import { productCardVariantFields, type VariantSummaryRow } from "@/lib/variants";
import type { ProductItem } from "@/features/products/components/ProductCard";
import { readFieldRows, type CustomizationField, type CustomizationFieldRow } from "@/lib/customization";

interface ImageRow {
  id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  order: number | null;
}

export interface ProductOptionDetail {
  id: string;
  name: string;
  isVisual: boolean;
  values: { id: string; value: string; imageUrl: string | null }[];
}

export interface ProductVariantDetail {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  // One value per option, in option order.
  valueIds: string[];
  // Units purchasable now; null = unlimited ('continue selling').
  stock: number | null;
  // Image of its visual option value; null = product cover.
  imageUrl: string | null;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  // Lowest active variant price.
  price: number;
  weightGrams: number | null;
  widthMm: number | null;
  heightMm: number | null;
  lengthMm: number | null;
  category: { id: string; name: string; slug: string };
  images: { url: string; alt: string }[];
  options: ProductOptionDetail[];
  // Active variants only.
  variants: ProductVariantDetail[];
  // What the customer personalises (name, photo…); empty for most products.
  customizationFields: CustomizationField[];
}

function sortImages<T extends { order: number | null; is_primary: boolean }>(images: T[]): T[] {
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  // Cover first, then the rest in order.
  const coverIndex = sorted.findIndex((image) => image.is_primary);
  if (coverIndex > 0) sorted.unshift(...sorted.splice(coverIndex, 1));
  return sorted;
}

const positiveOrNull = (value: number | null) => (value && value > 0 ? Number(value) : null);

interface ProductDetailRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  status: string | null;
  inventory_policy: string | null;
  weight_grams: number | null;
  width_mm: number | null;
  height_mm: number | null;
  length_mm: number | null;
  categories: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[];
  product_images: ImageRow[];
  product_options: {
    id: string;
    name: string;
    position: number;
    is_visual: boolean;
    product_option_values: { id: string; value: string; position: number; image_id: string | null }[];
  }[];
  product_variants: {
    id: string;
    title: string;
    sku: string | null;
    price: number;
    is_active: boolean;
    position: number;
    inventory: InventoryJoin;
    variant_option_values: { option_value_id: string }[];
  }[];
  product_customization_fields: CustomizationFieldRow[];
}

/**
 * Loads an active product by category slug + product slug, with its
 * options and active variants. Returns null if it doesn't exist, is
 * inactive/draft, or is in another category. Cached per request so
 * metadata and the page share one query.
 */
export const getProductDetail = cache(
  async (categorySlug: string, productSlug: string): Promise<ProductDetail | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("products")
      .select(
        `id, name, slug, description, price, status, inventory_policy,
         weight_grams, width_mm, height_mm, length_mm,
         categories!inner ( id, name, slug ),
         product_images ( id, url, alt_text, is_primary, "order" ),
         product_options ( id, name, position, is_visual,
           product_option_values ( id, value, position, image_id ) ),
         product_variants ( id, title, sku, price, is_active, position,
           inventory ( stock_available, stock_reserved ),
           variant_option_values ( option_value_id ) ),
         product_customization_fields ( id, key, label, type, required, help_text, config, pricing, position )`
      )
      .eq("slug", productSlug)
      .eq("categories.slug", categorySlug)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Product detail error:", error);
      return null;
    }

    const row = data as unknown as ProductDetailRow | null;

    if (!row || row.status?.toLowerCase() === "draft") return null;

    const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    if (!category) return null;

    const images = sortImages(row.product_images ?? []);
    const imageUrlById = new Map(images.map((image) => [image.id, image.url]));

    const options: ProductOptionDetail[] = [...(row.product_options ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((option) => ({
        id: option.id,
        name: option.name,
        isVisual: option.is_visual,
        values: [...(option.product_option_values ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((value) => ({
            id: value.id,
            value: value.value,
            imageUrl: value.image_id ? imageUrlById.get(value.image_id) ?? null : null,
          })),
      }));

    // valueId → option index, to order each variant's values like the options.
    const optionIndexByValue = new Map<string, number>();
    options.forEach((option, index) =>
      option.values.forEach((value) => optionIndexByValue.set(value.id, index))
    );
    const valueImage = new Map(options.flatMap((o) => o.values.map((v) => [v.id, v.imageUrl] as const)));

    const variants: ProductVariantDetail[] = [...(row.product_variants ?? [])]
      .filter((variant) => variant.is_active)
      .sort((a, b) => a.position - b.position)
      .map((variant) => {
        const valueIds = (variant.variant_option_values ?? [])
          .map((link) => link.option_value_id)
          .filter((id) => optionIndexByValue.has(id))
          .sort((a, b) => optionIndexByValue.get(a)! - optionIndexByValue.get(b)!);

        return {
          id: variant.id,
          title: variant.title ?? "",
          sku: variant.sku,
          price: Number(variant.price),
          valueIds,
          stock: purchasableStock(row.inventory_policy, variant.inventory),
          imageUrl: valueIds.map((id) => valueImage.get(id)).find(Boolean) ?? null,
        };
      });

    if (variants.length === 0) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      price: Math.min(...variants.map((variant) => variant.price)),
      weightGrams: positiveOrNull(row.weight_grams),
      widthMm: positiveOrNull(row.width_mm),
      heightMm: positiveOrNull(row.height_mm),
      lengthMm: positiveOrNull(row.length_mm),
      category,
      images: images.map((image, index) => ({
        url: image.url,
        alt: image.alt_text || `${row.name} image ${index + 1}`,
      })),
      options,
      variants,
      customizationFields: readFieldRows(row.product_customization_fields),
    };
  }
);

/** Other active products from the same category, for "You may also like". */
export async function getRelatedProducts(
  product: Pick<ProductDetail, "id" | "category">,
  limit = 4
): Promise<ProductItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, slug, description, price, status, inventory_policy,
       product_images ( url, is_primary, "order" ),
       product_variants ( id, is_active, price, inventory ( stock_available, stock_reserved ) ),
       product_customization_fields ( id )`
    )
    .eq("category_id", product.category.id)
    .eq("is_active", true)
    .neq("id", product.id)
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  if (error) {
    console.error("Related products error:", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.status?.toLowerCase() !== "draft")
    .slice(0, limit)
    .map((row) => {
      const cover = sortImages(
        (row.product_images ?? []) as { url: string; is_primary: boolean; order: number | null }[]
      )[0];

      return {
        id: row.id,
        slug: row.slug,
        title: row.name,
        description: row.description ?? "",
        price: Number(row.price),
        rating: 0,
        reviewCount: 0,
        imageUrl: cover?.url ?? "",
        category: product.category.slug,
        ...productCardVariantFields(
          row.product_variants as VariantSummaryRow[] | null,
          row.inventory_policy,
          row.product_customization_fields as { id: string }[] | null
        ),
      };
    });
}
