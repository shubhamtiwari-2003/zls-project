import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import Breadcrumb from "@/components/shared/Breadcrumb";
import { ProductCard } from "@/features/products/components/ProductCard";
import { ProductDetailView } from "@/features/products/components/ProductDetailView";
import { ProductDetailsSections } from "@/features/products/components/ProductDetailsSections";
import { PaymentMethodsBadge } from "@/features/products/components/PaymentMethodsBadge";
import { getProductDetail, getRelatedProducts } from "@/lib/products.server";
import { formatINR } from "@/lib/shop-config";
import { getShopSettings } from "@/lib/shop-settings.server";
import { getLivePromotions } from "@/lib/promotions.server";
import { noticesFor } from "@/lib/promotions";
import { ProductNotices } from "@/components/promotions/ProductNotices";

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

  const [related, settings, promotions] = await Promise.all([
    getRelatedProducts(product),
    getShopSettings(),
    getLivePromotions(),
  ]);
  const notices = noticesFor(promotions.productNotices, { id: product.id, categoryId: product.category.id });

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
          {/* Campaign notes (Admin → Promotions → Product page notices) */}
          <ProductNotices notices={notices} className="mt-4" />

          {/* Payment methods (Razorpay) */}
          <PaymentMethodsBadge className="mt-4" />

          {/* Shipping */}
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
            <Truck size={18} className="shrink-0 text-success" />
            <span>Free shipping on orders above {formatINR(settings.freeShippingThreshold)}</span>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{product.description}</p>
            </div>
          )}

          {/* Highlights, what's in the box, specifications, care */}
          <ProductDetailsSections details={product.details} baseSpecs={specs} />
        </ProductDetailView>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-14 sm:mt-20">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold sm:text-2xl">You may also like</h2>
              <Link
                href={`/products/${product.category.slug}`}
                className="text-sm text-muted-foreground hover:text-foreground"
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
