import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard, ProductItem } from "@/features/products/components/ProductCard";



const Trending_deals: ProductItem[] = [
  {
    id: "1",
    title: "Wireless Earbuds",
    description: "Organic Cotton, fairtrade certified",
    price: 89.0,
    rating: 5,
    reviewCount: 121,
    imageUrl: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "2",
    title: "AirPods Max",
    description: "A perfect balance of high-fidelity audio",
    price: 559.0,
    rating: 5,
    reviewCount: 121,
    imageUrl: "https://images.unsplash.com/photo-1693168045046-9a4b4f30f1c7?q=80&w=742&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    isPopular: true,
  },
  {
    id: "3",
    title: "Bose BT Earphones",
    description: "Table with air purifier, stained venner/black",
    price: 289.0,
    rating: 5,
    reviewCount: 121,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "4",
    title: "VIVEFO Headphones",
    description: "Wired Stereo Headsets With Mic",
    price: 39.0,
    rating: 5,
    reviewCount: 121,
    imageUrl: "https://images.unsplash.com/photo-1598662957563-ee4965d4d72c?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

export function TrendingProducts() {
    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-10 lg:px-16 xl:px-20 mt-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Todays Best Deals For You!
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Handpicked discounts refreshed daily</p>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold text-muted hover:underline flex items-center gap-1"
          >
            See All Deals <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Trending_deals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    )
}