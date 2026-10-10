import "server-only";

import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { storefrontCache } from "@/lib/storefront-cache";
import { productCardVariantFields, type VariantSummaryRow } from "@/lib/variants";
import type { ProductFilters } from "@/lib/catalog";
import type { ProductItem } from "@/features/products/components/ProductCard";

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

/** Active categories in the admin's order (Admin → Categories). Cached per request (header + filter bar). */
async function loadActiveCategories(): Promise<CategoryOption[]> {
  const supabase = createPublicClient();

  const read = (ordered: boolean) => {
    let query = supabase.from("categories").select("id, name, slug").eq("is_active", true);
    if (ordered) query = query.order("sort_order", { ascending: true });
    return query.order("name", { ascending: true });
  };

  let { data, error } = await read(true);
  // Before the categories migration there's no sort_order: A–Z.
  if (error && isMissingColumn(error)) ({ data, error } = await read(false));

  if (error) throw new Error(`Categories: ${error.message}`);

  return data ?? [];
}

export const getActiveCategories = cache(storefrontCache("categories", loadActiveCategories, () => []));

/** Postgres "column does not exist" (a migration hasn't run yet). */
const isMissingColumn = (error: { code?: string; message: string }) =>
  error.code === "42703" || /column .* does not exist/i.test(error.message);

interface ProductListRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  status: string | null;
  inventory_policy: string | null;
  categories: { slug: string } | { slug: string }[] | null;
  product_images: { url: string; is_primary: boolean; order: number | null }[];
  product_variants: VariantSummaryRow[] | null;
  product_customization_fields: { id: string }[] | null;
}

// Characters that would break a PostgREST filter or act as wildcards.
export const cleanSearch = (q: string) => q.replace(/[,()*%\\:"'.]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Active products for listing pages, filtered and sorted in the database.
 * `categoryIds` limits the result (category page); otherwise the filter's
 * category slugs are used.
 */
async function loadProducts(
  filters: ProductFilters,
  options: { categoryIds?: string[] } = {}
): Promise<{ products: ProductItem[]; error: boolean }> {
  const supabase = createPublicClient();

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
      `id, name, slug, description, price, compare_at_price, status, inventory_policy,
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

  if (error) throw new Error(`Product list: ${error.message}`);

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
        compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : null,
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

/** Cached (see storefront-cache.ts). `error` is true when the database couldn't be read. */
export const listProducts = storefrontCache("products", loadProducts, () => ({ products: [], error: true }));

export interface CategoryTile {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  /** "New Launch" badge: set by the admin, or automatic (a product added in the last NEW_LAUNCH_DAYS days). */
  isNew: boolean;
}

const NEW_LAUNCH_DAYS = 30;

interface CategoryTileRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  badge_mode?: "auto" | "new" | "none";
  products: {
    created_at: string;
    is_active: boolean;
    status: string | null;
    product_images: { url: string; is_primary: boolean; order: number | null }[];
  }[];
}

/**
 * Homepage "Shop by category": active categories that have at least one
 * product on sale. Picture: the category's own image, otherwise the cover
 * photo of its newest product.
 */
async function loadCategoryTiles(): Promise<CategoryTile[]> {
  const supabase = createPublicClient();
  const products = `products ( created_at, is_active, status, product_images ( url, is_primary, "order" ) )`;

  // Before the categories migration there's no badge_mode / sort_order.
  const read = async (migrated: boolean): Promise<{ data: unknown; error: { code?: string; message: string } | null }> => {
    let query = supabase
      .from("categories")
      .select(`id, name, slug, image_url, ${migrated ? "badge_mode, " : ""}${products}`)
      .eq("is_active", true);
    if (migrated) query = query.order("sort_order", { ascending: true });
    return query.order("name", { ascending: true });
  };

  let { data, error } = await read(true);
  if (error && isMissingColumn(error)) ({ data, error } = await read(false));

  if (error) throw new Error(`Category tiles: ${error.message}`);

  const newSince = Date.now() - NEW_LAUNCH_DAYS * 86_400_000;

  return ((data ?? []) as unknown as CategoryTileRow[]).flatMap((category) => {
    const products = (category.products ?? [])
      .filter((product) => product.is_active && product.status?.toLowerCase() !== "draft")
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (products.length === 0) return [];

    // Newest product that has a photo.
    const cover = products
      .map((product) => {
        const images = [...(product.product_images ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return (images.find((image) => image.is_primary) ?? images[0])?.url;
      })
      .find(Boolean);

    return [
      {
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image_url || cover || null,
        isNew:
          category.badge_mode === "new" ||
          (category.badge_mode !== "none" && new Date(products[0].created_at).getTime() >= newSince),
      },
    ];
  });
}

export const getCategoryTiles = storefrontCache("category-tiles", loadCategoryTiles, () => []);

export interface CategoryDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

async function loadCategoryBySlug(slug: string): Promise<CategoryDetail | null> {
  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, name, slug, description, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Category: ${error.message}`);
  return data;
}

/** An active category by its link name, for its page (cached; shared by the page and its metadata). */
export const getCategoryBySlug = cache(storefrontCache("category", loadCategoryBySlug, () => null));
