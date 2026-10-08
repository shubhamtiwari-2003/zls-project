import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard, type ProductItem } from "@/features/products/components/ProductCard";

/**
 * Homepage row of the newest real products. Stands in until collections
 * (Trending, Best deals…) are built; deliberately makes no "trending" or
 * "deal" claims the data can't back up.
 */
export function LatestProducts({ products }: { products: ProductItem[] }) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto mt-4 max-w-7xl overflow-hidden px-4 sm:px-10 lg:px-16 xl:px-20">
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">New from the studio</h2>
          <p className="mt-1 text-xs text-muted-foreground">Our latest 3D-printed pieces, made to order.</p>
        </div>
        <Link
          href="/products"
          className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-bold text-muted-foreground hover:underline"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
