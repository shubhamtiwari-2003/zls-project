import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { productCardVariantFields, type VariantSummaryRow } from "@/lib/variants";
import type { ProductFilters } from "@/lib/catalog";
import type { ProductItem } from "@/features/products/components/ProductCard";

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

/** Active categories, A–Z. Cached per request (header + filter bar). */
export const getActiveCategories = cache(async (): Promise<CategoryOption[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Categories error:", error);
    return [];
  }

  return data ?? [];
});

interface ProductListRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  status: string | null;
  inventory_policy: string | null;
  categories: { slug: string } | { slug: string }[] | null;
  product_images: { url: string; is_primary: boolean; order: number | null }[];
  product_variants: VariantSummaryRow[] | null;
  product_customization_fields: { id: string }[] | null;
}

// Characters that would break a PostgREST filter or act as wildcards.
const cleanSearch = (q: string) => q.replace(/[,()*%\\:"'.]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Active products for listing pages, filtered and sorted in the database.
 * `categoryIds` limits the result (category page); otherwise the filter's
 * category slugs are used.
 */
export async function listProducts(
  filters: ProductFilters,
  options: { categoryIds?: string[] } = {}
): Promise<{ products: ProductItem[]; error: boolean }> {
  const supabase = await createClient();

  let categoryIds = options.categoryIds;

  if (!categoryIds && filters.categories.length) {
    const categories = await getActiveCategories();
    categoryIds = categories
      .filter((category) => filters.categories.includes(category.slug))
      .map((category) => category.id);

    // Only unknown slugs selected: nothing matches.
    if (categoryIds.length === 0) return { products: [], error: false };
  }

  let query = supabase
    .from("products")
    .select(
      `id, name, slug, description, price, status, inventory_policy,
       categories ( slug ),
       product_images ( url, is_primary, "order" ),
       product_variants ( id, is_active, price, inventory ( stock_available, stock_reserved ) ),
       product_customization_fields ( id )`
    )
    .eq("is_active", true);

  if (categoryIds?.length) query = query.in("category_id", categoryIds);

  // products.price is the lowest active variant price ("From ₹…").
  if (filters.min !== null) query = query.gte("price", filters.min);
  if (filters.max !== null) query = query.lte("price", filters.max);

  const search = cleanSearch(filters.q);
  if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "name-asc":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(200);

  if (error) {
    console.error("Product list error:", error);
    return { products: [], error: true };
  }

  const products = ((data ?? []) as unknown as ProductListRow[])
    .filter((row) => row.status?.toLowerCase() !== "draft")
    .map((row): ProductItem => {
      const images = [...(row.product_images ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const cover = images.find((image) => image.is_primary) ?? images[0];
      const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;

      return {
        id: row.id,
        slug: row.slug,
        title: row.name,
        description: row.description ?? "",
        price: Number(row.price),
        // Reviews come later.
        rating: 0,
        reviewCount: 0,
        imageUrl: cover?.url ?? "",
        isPopular: false,
        category: category?.slug ?? "uncategorized",
        ...productCardVariantFields(row.product_variants, row.inventory_policy, row.product_customization_fields),
      };
    });

  return { products, error: false };
}
