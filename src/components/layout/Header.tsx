// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoriesMenu } from "./CategoriesMenu";
import { AccountMenu } from "./AccountMenu";
import white_logo from "../../../public/White-logo-text.png";
import black_logo from "../../../public/black_logo.png";
import ThemeToggle from "../shared/toggleTheme";
import { CartDrawer } from "@/features/cart/components/CartDrawer";
import { useCartStore } from "@/features/cart/store/cartStore";
import { useHydrated } from "@/hooks/useHydrated";

interface HeaderProps {
  // Active categories (from the shop layout).
  categories: { name: string; slug: string }[];
}

export function Header({ categories }: HeaderProps) {
  const router = useRouter();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const hydrated = useHydrated();
  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  return (
    <>
      <header className="w-full">
        {/* Top Utility Bar */}
        {/* <NewsBar/AnnouncementBar> */}

        {/* Main Navigation Bar */}
        <div className="bg-background">
          <div className="w-full px-4 sm:px-10 lg:px-16 xl:px-20 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
            <Link href="/" className="flex items-center">
              {/* Light theme → Black logo */}
              <Image
                src={black_logo}
                alt="Z Layer Studio"
                width={500}
                height={700}
                className="hidden h-auto w-32 sm:w-40 dark:block "
                priority
              />

              {/* Dark theme → White logo */}
              <Image
                src={white_logo}
                alt="Z Layer Studio"
                width={500}
                height={700}
                className="block h-auto w-32 sm:w-40 dark:hidden"
                priority
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-foreground ">
              <Link href="/products" className="hover:text-emerald-700">
                All Products
              </Link>
              <CategoriesMenu categories={categories} />
              <Link href="/deals" className="hover:text-emerald-700">Deals</Link>
              <Link href="/whats-new" className="hover:text-emerald-700">What&apos;s New</Link>
              <Link href="/delivery" className="hover:text-emerald-700">Delivery</Link>
            </nav>

            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const q = search.trim();
                router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
                setSearch("");
              }}
              className="flex-1 max-w-md relative hidden sm:block"
            >
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={60}
                placeholder="Search Product"
                aria-label="Search products"
                className="w-full bg-muted border-none rounded-full py-2.5 pl-5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#003d29]/20"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-foreground"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            <div className="flex shrink-0 items-center gap-4 sm:gap-6 text-sm font-semibold text-zinc-800">

              <ThemeToggle />

              {/* Account: sign-in link or dropdown */}
              <AccountMenu />

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative text-foreground hover:text-emerald-700"
                aria-label={`Open cart (${hydrated ? cartCount : 0} items)`}
              >
                <ShoppingCart />
                {hydrated && cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#058e60] px-1 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </button>

              <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
              />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}