// Product listing filters, read from / written to the URL so filtered
// pages can be shared and the back button works.
//
//   /products?q=batman&category=posters,keychains&min=299&max=999&sort=price-asc

export type ProductSort = "newest" | "price-asc" | "price-desc" | "name-asc";

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
];

// Preset ranges in the Price menu (max null = no upper limit).
export const PRICE_RANGES: { label: string; min: number | null; max: number | null }[] = [
  { label: "Under ₹299", min: null, max: 299 },
  { label: "₹299 – ₹499", min: 299, max: 499 },
  { label: "₹499 – ₹999", min: 499, max: 999 },
  { label: "₹999 – ₹1,999", min: 999, max: 1999 },
  { label: "₹1,999 & above", min: 1999, max: null },
];

export interface ProductFilters {
  q: string;
  // Category slugs.
  categories: string[];
  min: number | null;
  max: number | null;
  sort: ProductSort;
}

type SearchParamsLike = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

const price = (value: string | string[] | undefined) => {
  const digits = first(value).replace(/\D/g, "").slice(0, 7);
  return digits ? Number(digits) : null;
};

export function parseProductFilters(params: SearchParamsLike): ProductFilters {
  const sort = first(params.sort) as ProductSort;
  let min = price(params.min);
  let max = price(params.max);

  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  return {
    q: first(params.q).trim().slice(0, 60),
    categories: first(params.category)
      .split(",")
      .map((slug) => slug.trim().toLowerCase())
      .filter((slug) => /^[a-z0-9-]{1,80}$/.test(slug))
      .slice(0, 20),
    min,
    max,
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort : "newest",
  };
}

export const hasActiveFilters = (filters: ProductFilters) =>
  Boolean(filters.q || filters.categories.length || filters.min !== null || filters.max !== null);

/** "₹299 – ₹499", "Under ₹299", "₹1,999 & above", or null when no price filter. */
export function priceRangeLabel(min: number | null, max: number | null): string | null {
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  if (min !== null && max !== null) return `${inr(min)} – ${inr(max)}`;
  if (max !== null) return `Under ${inr(max)}`;
  if (min !== null) return `${inr(min)} & above`;
  return null;
}
