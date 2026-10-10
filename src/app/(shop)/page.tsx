// src/app/(shop)/page.tsx
import { BannerHero } from "@/features/home/components/Banner-Hero";
import { TopCategories } from "@/features/home/components/TopCategories";
import { LatestProducts } from "@/features/home/components/LatestProducts";
import { parseProductFilters } from "@/lib/catalog";
import { getCategoryTiles, listProducts } from "@/lib/catalog.server";
import { getLivePromotions } from "@/lib/promotions.server";

// Newest products on the homepage (until collections replace this row).
const LATEST_COUNT = 8;

export default async function HomePage() {
  const [{ products }, promotions, categories] = await Promise.all([
    listProducts(parseProductFilters({})),
    getLivePromotions(),
    getCategoryTiles(),
  ]);

  return (
    <div className="w-full pb-20 ">
      {/* 1. Hero: campaign banners (Admin → Promotions), or the default slide */}
      <BannerHero banners={promotions.heroBanners} />

      {/* 2. Shop by category (carousel, from the database) */}
      <TopCategories categories={categories} />

      {/* 3. Newest products */}
      <LatestProducts products={products.slice(0, LATEST_COUNT)} />
    </div>
  );
}
