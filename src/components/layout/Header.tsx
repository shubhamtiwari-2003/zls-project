// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingCart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoriesMenu } from "./CategoriesMenu";
import { AccountMenu } from "./AccountMenu";
import white_logo from "../../../public/White-logo-text.png";
import black_logo from "../../../public/black_logo.png";
import ThemeToggle from "../shared/toggleTheme";
import { CartDrawer } from "@/features/cart/components/CartDrawer";
import { useCartStore } from "@/features/cart/store/cartStore";
import { useHydrated } from "@/hooks/useHydrated";
import {
  CART_ADDED_EVENT,
  CART_OPEN_EVENT,
  bumpCartIcon,
  flyToCart,
  type CartAddedDetail,
} from "@/features/cart/lib/cartFeedback";

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
  const cartButtonRef = useRef<HTMLButtonElement>(null);

  // The header sticks to the top; once the page scrolls it gets a border
  // and a translucent background so content behind it stays readable.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // "Added to cart": fly the product into the cart icon, then bounce it.
  // "View cart" (toast button): open the drawer.
  useEffect(() => {
    const onAdded = async (event: Event) => {
      const icon = cartButtonRef.current;
      if (!icon) return;

      const { image, from } = (event as CustomEvent<CartAddedDetail>).detail;
      await flyToCart(image, from, icon);
      bumpCartIcon(icon);
    };
    const onOpen = () => setIsCartOpen(true);

    window.addEventListener(CART_ADDED_EVENT, onAdded);
    window.addEventListener(CART_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(CART_ADDED_EVENT, onAdded);
      window.removeEventListener(CART_OPEN_EVENT, onOpen);
    };
  }, []);

  return (
    <>
      {/* Sticky so the cart (and its add-to-cart animation) stays in view. */}
      <header className="sticky top-0 z-40 w-full">
        {/* Top Utility Bar */}
        {/* <NewsBar/AnnouncementBar> */}

        {/* Main Navigation Bar */}
        <div
          className={`border-b transition-[background-color,border-color,box-shadow] duration-300 ${
            scrolled
              ? "border-border bg-background/85 shadow-sm backdrop-blur-md"
              : "border-transparent bg-background"
          }`}
        >
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
                ref={cartButtonRef}
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