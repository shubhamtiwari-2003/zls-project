// src/app/(shop)/products/page.tsx
import { HeroBanner } from "@/features/products/components/HeroBanner";
import { FilterBar } from "@/features/products/components/FilterBar";
import { ProductCard, ProductItem } from "@/features/products/components/ProductCard";
import Breadcrumb from "@/components/shared/Breadcrumb";

const ALL_PRODUCTS: ProductItem[] = [
  {
    id: "1",
    title: "Wireless Earbuds, IPX8",
    description: "Organic Cotton, fairtrade certified",
    price: 89.0,
    rating: 5,
    reviewCount: 121,
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "2",
    title: "AirPods Max",
    description: "A perfect balance of high-fidelity audio",
    price: 559.0,
    rating: 5,
    reviewCount: 121,
    imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80",
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
    title: "VIVEFOX Headphones",
    description: "Wired Stereo Headsets With Mic",
    price: 39.0,
    rating: 5,
    reviewCount: 121,
    imageUrl: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80",
  },
];

export default function AllProductsPage() {
  return (
    <div className="w-full pb-20">
      <HeroBanner />
      <div className=" p-3 mx-40">
        <Breadcrumb />
      </div>
      <FilterBar />
      <main className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 mt-12">
        <h1 className="text-2xl font-bold text-zinc-900 mb-8">All Products</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {ALL_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
    </div>
  );
}