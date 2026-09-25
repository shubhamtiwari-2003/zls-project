// src/app/(shop)/page.tsx
import { BannerHero } from "@/features/home/components/Banner-Hero";
import { TopCategories } from "@/features/home/components/TopCategories";
import { ProductCard, ProductItem } from "@/features/products/components/ProductCard";
import { TrendingProducts } from "@/features/home/components/TrendingProducts";

// Featured deals section beneath categories
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

export default function HomePage() {
  return (
    <div className="w-full pb-20 ">
      {/* 1.Store Hero Section*/}
      <BannerHero />

      {/* 2. Top Categories */}
      <TopCategories />

      {/* 3. Todays Best Deals / Trending Grid */}
      <TrendingProducts/>
      
    </div>
  );
}