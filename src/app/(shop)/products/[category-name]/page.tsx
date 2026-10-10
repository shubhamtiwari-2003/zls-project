import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/features/products/components/ProductCard";
import { ResponsiveImage } from "@/components/shared/ResponsiveImage";
import { FilterBar } from "@/features/products/components/FilterBar";
import Breadcrumb from "@/components/shared/Breadcrumb";
import { hasActiveFilters, parseProductFilters } from "@/lib/catalog";
import { getActiveCategories, getCategoryBySlug as getCategory, listProducts } from "@/lib/catalog.server";

// Banner when the category has no photo of its own (Admin → Categories).
import categoryBanner from "../../../../../public/optimized/category-banner-1920.webp";
import categoryBannerMobile from "../../../../../public/optimized/category-banner-828.webp";

interface CategoryPageProps {
  params: Promise<{
    "category-name": string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { "category-name": categorySlug } = await params;
  const category = await getCategory(categorySlug);

  return { title: category ? `${category.name} | Z Factor Studio` : "Category not found | Z Factor Studio" };
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
        <ResponsiveImage
          desktop={category.image_url || categoryBanner}
          mobile={category.image_url ? null : categoryBannerMobile}
          alt={category.image_url ? `${category.name} collection` : ""}
          priority
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
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} />
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
