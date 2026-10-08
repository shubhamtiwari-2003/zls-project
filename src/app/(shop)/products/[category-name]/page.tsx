import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/features/products/components/ProductCard";
import { FilterBar } from "@/features/products/components/FilterBar";
import Breadcrumb from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { hasActiveFilters, parseProductFilters } from "@/lib/catalog";
import { getActiveCategories, listProducts } from "@/lib/catalog.server";

import postersBanner from "../../../../../public/poster-banner.png";

interface CategoryPageProps {
  params: Promise<{
    "category-name": string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function getCategory(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) console.error("Category error:", error);
  return data;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { "category-name": categorySlug } = await params;
  const category = await getCategory(categorySlug);

  return { title: category ? `${category.name} | Z Layer Studio` : "Category not found | Z Layer Studio" };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { "category-name": categorySlug } = await params;
  const category = await getCategory(categorySlug);

  if (!category) notFound();

  const filters = parseProductFilters(await searchParams);

  const [categories, { products, error }] = await Promise.all([
    getActiveCategories(),
    listProducts(filters, { categoryIds: [category.id] }),
  ]);

  // The category itself isn't a filter here.
  const filtered = hasActiveFilters({ ...filters, categories: [] });

  return (
    <main className="min-h-screen bg-background">
      {/* HERO */}
      <section className="relative h-55 overflow-hidden sm:h-80 lg:h-100">
        <Image
          src={category.image_url || postersBanner}
          alt={`${category.name} collection`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6">
          <div className="max-w-2xl text-white">
            <h1 className="text-3xl font-bold leading-tight sm:text-5xl lg:text-6xl">{category.name}</h1>

            {category.description && (
              <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">{category.description}</p>
            )}
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Breadcrumb
          items={[
            { label: "Products", href: "/products" },
            { label: category.name, href: `/products/${category.slug}` },
          ]}
        />

        <FilterBar categories={categories} showCategoryFilter={false} resultCount={products.length} />

        <div className="mt-8">
          {error ? (
            <div className="rounded-xl border border-danger/20 bg-danger/10 p-6 text-sm text-danger">
              Unable to load products. Please try again.
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-6 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-75 flex-col items-center justify-center text-center">
              <p className="text-muted-foreground">
                {filtered ? "No products match your filters." : "No products available in this category yet."}
              </p>
              {filtered && (
                <Link
                  href={`/products/${category.slug}`}
                  className="mt-6 rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background"
                >
                  Clear filters
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
