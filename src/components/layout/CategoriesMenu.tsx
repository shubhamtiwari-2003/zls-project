"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface CategoriesMenuProps {
  categories: { name: string; slug: string }[];
}

/** Header "Categories" dropdown (categories come from the database). */
export function CategoriesMenu({ categories }: CategoriesMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1 hover:text-brand-bright"
      >
        Categories
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-3 w-60 rounded-2xl border border-border bg-background p-2 shadow-xl">
          {categories.length === 0 ? (
            <p className="px-3 py-2 text-sm font-normal text-muted-foreground">No categories yet</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {categories.map((category) => {
                const href = `/products/${category.slug}`;
                const active = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <li key={category.slug}>
                    <Link
                      href={href}
                      className={`block rounded-xl px-3 py-2 text-sm hover:bg-surface ${
                        active ? "font-semibold text-brand-bright" : "font-medium"
                      }`}
                    >
                      {category.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/products"
            className="mt-1 block rounded-xl border-t border-border px-3 pb-2 pt-3 text-sm font-semibold text-brand-bright hover:bg-surface"
          >
            View all products
          </Link>
        </div>
      )}
    </div>
  );
}
