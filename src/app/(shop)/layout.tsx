// src/app/(shop)/layout.tsx
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getActiveCategories } from "@/lib/catalog.server";
import { getLivePromotions } from "@/lib/promotions.server";
import { AnnouncementBar } from "@/components/promotions/AnnouncementBar";
import { PromoPopup } from "@/components/promotions/PromoPopup";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [categories, promotions] = await Promise.all([getActiveCategories(), getLivePromotions()]);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-clip">
      {/* Campaign messages (Admin → Promotions). Scrolls away; the header sticks. */}
      <AnnouncementBar messages={promotions.announcements} />
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer/>
      <PromoPopup popup={promotions.popup} />
    </div>
  );
}
