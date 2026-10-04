import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Truck } from "lucide-react";
import Breadcrumb from "@/components/shared/Breadcrumb";
import { ProductCard } from "@/features/products/components/ProductCard";
import { ProductDetailView } from "@/features/products/components/ProductDetailView";
import { getProductDetail, getRelatedProducts } from "@/lib/products.server";
import { FREE_SHIPPING_THRESHOLD, formatINR } from "@/lib/shop-config";

interface ProductPageProps {
  params: Promise<{
    "category-name": string;
    "product-name": string;
  }>;
  searchParams: Promise<{ variant?: string | string[] }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { "category-name": categorySlug, "product-name": productSlug } = await params;
  const product = await getProductDetail(categorySlug, productSlug);

  if (!product) return { title: "Product not found | Z Layer Studio" };

  const description =
    product.description?.slice(0, 160) ||
    `${product.name} — from ${formatINR(product.price)} at Z Layer Studio.`;

  return {
    title: `${product.name} | Z Layer Studio`,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { "category-name": categorySlug, "product-name": productSlug } = await params;
  const { variant } = await searchParams;
  const product = await getProductDetail(categorySlug, productSlug);

  if (!product) notFound();

  const related = await getRelatedProducts(product);

  const dimensions = [product.widthMm, product.heightMm, product.lengthMm].filter(
    (value): value is number => value !== null
  );

  const specs = [
    dimensions.length > 0 && { label: "Size", value: `${dimensions.join(" × ")} mm` },
    product.weightGrams && { label: "Weight", value: `${product.weightGrams} g` },
  ].filter((spec): spec is { label: string; value: string } => Boolean(spec));

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Breadcrumb
          items={[
            { label: "Products", href: "/products" },
            { label: product.category.name, href: `/products/${product.category.slug}` },
            { label: product.name, href: `/products/${product.category.slug}/${product.slug}` },
          ]}
        />

        <ProductDetailView product={product} initialVariantId={typeof variant === "string" ? variant : null}>
          {/* Highlights */}
          <div className="mt-8 space-y-3 rounded-2xl border border-border p-4 text-sm">
            <div className="flex items-center gap-3">
              <Truck size={18} className="shrink-0 text-green-600" />
              <span>Free shipping on orders above {formatINR(FREE_SHIPPING_THRESHOLD)}</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="shrink-0 text-green-600" />
              <span>Secure payments with UPI, cards and netbanking via Razorpay</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="mt-3 whitespace-pre-line leading-7 text-muted">{product.description}</p>
            </div>
          )}

          {/* Specs */}
          {specs.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {specs.map((spec) => (
                <div key={spec.label} className="rounded-2xl border border-border bg-surface p-4 text-center">
                  <p className="wrap-break-word font-bold">{spec.value}</p>
                  <p className="mt-1 text-xs uppercase text-muted">{spec.label}</p>
                </div>
              ))}
            </div>
          )}
        </ProductDetailView>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-14 sm:mt-20">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold sm:text-2xl">You may also like</h2>
              <Link
                href={`/products/${product.category.slug}`}
                className="text-sm text-muted hover:text-foreground"
              >
                View all
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
