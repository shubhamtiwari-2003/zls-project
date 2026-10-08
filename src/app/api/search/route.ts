import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanSearch } from "@/lib/catalog.server";
import type { SearchSuggestion } from "@/types/search";

const MAX_RESULTS = 6;

interface SearchRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  status: string | null;
  categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
  product_images: { url: string; is_primary: boolean; order: number | null }[];
}

/**
 * Header search suggestions: up to 6 active products whose name or
 * description matches. Name matches come first.
 *
 * GET /api/search?q=lamp
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("q") ?? "";
  const q = cleanSearch(raw.slice(0, 60));

  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, slug, price, compare_at_price, status,
       categories ( name, slug ),
       product_images ( url, is_primary, "order" )`
    )
    .eq("is_active", true)
    .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    .order("name", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Search suggestions error:", error);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }

  const needle = q.toLowerCase();

  const results: SearchSuggestion[] = ((data ?? []) as unknown as SearchRow[])
    .filter((row) => row.status?.toLowerCase() !== "draft")
    // Name matches before description-only matches; earlier match first.
    .map((row) => ({ row, at: row.name.toLowerCase().indexOf(needle) }))
    .sort((a, b) => (a.at === -1 ? 1 : 0) - (b.at === -1 ? 1 : 0) || a.at - b.at)
    .slice(0, MAX_RESULTS)
    .map(({ row }) => {
      const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
      const images = [...(row.product_images ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const cover = images.find((image) => image.is_primary) ?? images[0];

      return {
        id: row.id,
        name: row.name,
        href: `/products/${category?.slug ?? "all"}/${row.slug}`,
        category: category?.name ?? null,
        image: cover?.url ?? null,
        price: Number(row.price),
        compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : null,
      };
    });

  return NextResponse.json({ results });
}
