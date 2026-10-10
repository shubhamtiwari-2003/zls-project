// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingCart, X } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { CategoriesMenu } from "./CategoriesMenu";
import { HeaderSearch, HeaderSearchFallback } from "./HeaderSearch";
import { MobileMenu } from "./MobileMenu";
import { NAV_LINKS } from "./nav-links";
import { AccountMenu } from "./AccountMenu";
import white_logo from "../../../public/optimized/logo-text-white-320.webp";
import black_logo from "../../../public/optimized/logo-text-black-320.webp";
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
  const [isCartOpen, setIsCartOpen] = useState(false);
  // Phones: the search bar opens below the header from a search icon.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
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
        {/* Main Navigation Bar */}
        <div
          className={`border-b transition-[background-color,border-color,box-shadow] duration-300 ${
            scrolled
              ? "border-border bg-background/85 shadow-sm backdrop-blur-md"
              : "border-transparent bg-background"
          }`}
        >
          <div className="w-full px-4 sm:px-10 lg:px-16 xl:px-20 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
            {/* Menu (phones and tablets: the nav links below are hidden) */}
            <MobileMenu categories={categories} />

            <Link href="/" className="flex items-center">
              {/* Light theme → Black logo */}
              <Image
                src={black_logo}
                alt="Z Factor Studio"
                sizes="(min-width: 640px) 160px, 128px"
                className="hidden h-auto w-32 sm:w-40 dark:block "
                priority
              />

              {/* Dark theme → White logo */}
              <Image
                src={white_logo}
                alt="Z Factor Studio"
                sizes="(min-width: 640px) 160px, 128px"
                className="block h-auto w-32 sm:w-40 dark:hidden"
                priority
              />
            </Link>
            </div>

            <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-foreground ">
              <Link href="/products" className="hover:text-brand-bright">
                All Products
              </Link>
              <CategoriesMenu categories={categories} />
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-brand-bright">
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Search (tablet and desktop) */}
            <Suspense fallback={<HeaderSearchFallback className="hidden max-w-md flex-1 sm:block" />}>
              <HeaderSearch className="hidden max-w-md flex-1 sm:block" />
            </Suspense>

            <div className="flex shrink-0 items-center gap-4 sm:gap-6 text-sm font-semibold text-foreground">

              {/* Search (phones) */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen((open) => !open)}
                aria-label={mobileSearchOpen ? "Close search" : "Search products"}
                aria-expanded={mobileSearchOpen}
                className="text-foreground hover:text-brand-bright sm:hidden"
              >
                {mobileSearchOpen ? <X /> : <Search />}
              </button>

              {/* Theme and account: desktop only. Below lg they're in the
                  ☰ menu (MobileMenu). */}
              <div className="hidden lg:block">
                <ThemeToggle />
              </div>

              {/* Account: sign-in link or dropdown */}
              <div className="hidden lg:block">
                <AccountMenu />
              </div>

              <button
                type="button"
                ref={cartButtonRef}
                onClick={() => setIsCartOpen(true)}
                className="relative text-foreground hover:text-brand-bright"
                aria-label={`Open cart (${hydrated ? cartCount : 0} items)`}
              >
                <ShoppingCart />
                {hydrated && cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-bright px-1 text-[10px] font-bold text-white">
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

          {mobileSearchOpen && (
            <div className="px-4 pb-3 sm:hidden">
              <Suspense fallback={<HeaderSearchFallback />}>
                <HeaderSearch autoFocus onNavigate={() => setMobileSearchOpen(false)} />
              </Suspense>
            </div>
          )}
        </div>
      </header>
    </>
  );
}