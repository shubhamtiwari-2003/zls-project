"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronDown,
  Headset,
  Home,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
  Moon,
  Package,
  ShieldCheck,
  Shapes,
  Sun,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/features/auth/store/authStore";
import { BUSINESS } from "@/lib/business";
import { NAV_LINKS } from "./nav-links";
import { switchThemeSmoothly } from "@/lib/theme-transition";

interface MobileMenuPanelProps {
  categories: { name: string; slug: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Phone/tablet menu (below lg, where the header links, theme toggle and
 * account menu are hidden): a slide-in panel with shop links, categories,
 * account (incl. sign out), help and the light/dark switch.
 *
 * Loaded on first use by MobileMenu (the ☰ button), so the panel and its
 * UI library aren't part of every page's initial JavaScript.
 */
export function MobileMenuPanel({ categories, open, onOpenChange: setOpen }: MobileMenuPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const { resolvedTheme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const [categoriesOpen, setCategoriesOpen] = useState(true);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  const linkClass = (href: string) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
      isActive(href) ? "bg-muted font-semibold text-foreground" : "text-foreground hover:bg-muted"
    }`;

  // Closes the panel when a link is followed.
  const item = (href: string, label: string, Icon?: React.ElementType) => (
    <SheetClose asChild key={href}>
      <Link href={href} className={linkClass(href)} aria-current={isActive(href) ? "page" : undefined}>
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" /> : <span className="w-4 shrink-0" />}
        {label}
      </Link>
    </SheetClose>
  );

  // Same as the account dropdown: leave only if the session is really gone.
  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);

    if (!useAuthStore.getState().user) {
      setOpen(false);
      router.push("/");
      router.refresh();
    }
  };

  const sectionTitle = "px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <Sheet open={open} onOpenChange={setOpen}>

      <SheetContent side="left" className="w-[85vw] max-w-sm gap-0 p-0 lg:hidden">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="text-lg font-bold">{BUSINESS.brandName}</SheetTitle>
          <SheetDescription className="text-xs">Browse the shop, your orders and help.</SheetDescription>
        </SheetHeader>

        <nav aria-label="Main menu" className="flex-1 overflow-y-auto px-2 pb-6">
          <p className={sectionTitle}>Shop</p>
          {item("/", "Home", Home)}
          {item("/products", "All Products", LayoutGrid)}

          {categories.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setCategoriesOpen((value) => !value)}
                aria-expanded={categoriesOpen}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted"
              >
                <Shapes className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-left">Categories</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${categoriesOpen ? "rotate-180" : ""}`} />
              </button>

              {categoriesOpen && (
                <div className="ml-5 border-l border-border pl-2">
                  {categories.map((category) => item(`/products/${category.slug}`, category.name))}
                </div>
              )}
            </>
          )}

          {NAV_LINKS.map((link) => item(link.href, link.label))}

          <p className={sectionTitle}>Account</p>
          {user ? (
            <>
              {user.email && <p className="truncate px-3 pb-1 text-xs text-muted-foreground">{user.email}</p>}
              {item("/orders", "My Orders", Package)}
              {item("/account", "Profile & addresses", User)}
              {profile?.role === "admin" && item("/admin", "Admin panel", ShieldCheck)}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger hover:bg-danger/10 disabled:opacity-60"
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4 shrink-0" />
                )}
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            item(`/sign-in?next=${encodeURIComponent(pathname)}`, "Sign in / Sign up", LogIn)
          )}

          <p className={sectionTitle}>Help</p>
          {item("/contact-us", "Contact Us", Headset)}
          {item("/shipping-policy", "Shipping Policy")}
          {item("/cancellation-and-refund-policy", "Cancellation & Refunds")}
          {item("/terms-and-conditions", "Terms & Conditions")}

          <p className={sectionTitle}>Appearance</p>
          <div role="radiogroup" aria-label="Theme" className="mx-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(
              [
                { value: "light", label: "Light", Icon: Sun },
                { value: "dark", label: "Dark", Icon: Moon },
              ] as const
            ).map(({ value, label, Icon }) => {
              const selected = resolvedTheme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => switchThemeSmoothly(setTheme, value)}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${
                    selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
