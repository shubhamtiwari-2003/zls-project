// src/app/(shop)/layout.tsx
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getActiveCategories } from "@/lib/catalog.server";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const categories = await getActiveCategories();

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer/>
    </div>
  );
}
