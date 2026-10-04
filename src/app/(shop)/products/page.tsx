// src/app/(shop)/products/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar } from "@/features/products/components/FilterBar";
import { ProductCard } from "@/features/products/components/ProductCard";
import Breadcrumb from "@/components/shared/Breadcrumb";
import { hasActiveFilters, parseProductFilters } from "@/lib/catalog";
import { getActiveCategories, listProducts } from "@/lib/catalog.server";

export const metadata: Metadata = {
  title: "All Products | Z Layer Studio",
};

interface AllProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AllProductsPage({ searchParams }: AllProductsPageProps) {
  const filters = parseProductFilters(await searchParams);

  const [categories, { products, error }] = await Promise.all([
    getActiveCategories(),
    listProducts(filters),
  ]);

  const filtered = hasActiveFilters(filters);

  return (
    <div className="w-full px-4 pb-20 sm:px-10 lg:px-16 xl:px-20">
      <Breadcrumb items={[{ label: "Products", href: "/products" }]} />

      <h1 className="mb-6 text-2xl font-bold text-foreground sm:text-3xl">All Products</h1>

      <FilterBar categories={categories} resultCount={products.length} />

      <section className="mt-8">
        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-600">
            Unable to load products. Please try again.
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-border p-10 text-center">
            <p className="text-lg font-medium">No products found</p>
            <p className="mt-2 text-sm text-muted">
              {filtered ? "Try a different search or remove some filters." : "There are no products available yet."}
            </p>
            {filtered && (
              <Link
                href="/products"
                className="mt-6 inline-block rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background"
              >
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
