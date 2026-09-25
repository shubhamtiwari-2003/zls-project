// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, User, ShoppingCart, ChevronDown, Phone } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "@/features/auth/components/AuthModal";
import white_logo from "../../../public/White-logo-text.png";
import black_logo from "../../../public/black_logo.png";
import ThemeToggle from "../shared/toggleTheme";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { CartDrawer } from "@/features/cart/components/CartDrawer";

export function Header() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { mounted, resolvedTheme } = useResolvedTheme();

  return (
    <>
      <header className="w-full">
        {/* Top Utility Bar */}
        {/* <NewsBar/AnnouncementBar> */}

        {/* Main Navigation Bar */}
        <div className="bg-background">
          <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 h-20 flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2 text-2xl font-black text-foreground tracking-tight">
              {/* Light theme */}
              <Image
                src = {white_logo.src}
                alt="Z Layer Studio"
                className="block dark:hidden h-auto w-40"
                priority
                width={500}
                height={700}
              />

              {/* Dark theme */}
              <Image
                src={black_logo}
                alt="Z Layer Studio"
                className="hidden dark:block h-auto w-40"
                priority
                width={500}
                height={700}
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-foreground ">
              <button className="flex items-center gap-1 hover:text-emerald-700">
                Categories <ChevronDown className="w-4 h-4" />
              </button>
              <Link href="/deals" className="hover:text-emerald-700">Deals</Link>
              <Link href="/whats-new" className="hover:text-emerald-700">What&apos;s New</Link>
              <Link href="/delivery" className="hover:text-emerald-700">Delivery</Link>
            </nav>

            <div className="flex-1 max-w-md relative hidden sm:block">
              <input
                type="text"
                placeholder="Search Product"
                className="w-full bg-muted border-none rounded-full py-2.5 pl-5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#003d29]/20"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-6 text-sm font-semibold text-zinc-800">

              <ThemeToggle />

              {/* Account Button: Opens Modal */}
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-2 text-foreground hover:text-emerald-700 transition cursor-pointer"
              >

                <User className="w-5 h-5" />
                <span className="hidden sm:inline ">Account</span>
              </button>

              {!isCartOpen && <button onClick={() => (setIsCartOpen(true))} > <ShoppingCart /></button>}

              <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Floating Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}