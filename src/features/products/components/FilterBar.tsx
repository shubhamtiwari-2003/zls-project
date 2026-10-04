"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import {
  PRICE_RANGES,
  SORT_OPTIONS,
  hasActiveFilters,
  parseProductFilters,
  priceRangeLabel,
} from "@/lib/catalog";
import { parseWholeNumber } from "@/lib/number-input";

interface FilterBarProps {
  categories: { name: string; slug: string }[];
  // Hidden on a category page (the page is the category).
  showCategoryFilter?: boolean;
  resultCount: number;
}

type Menu = "category" | "price" | "sort" | null;

const SEARCH_DELAY_MS = 400;

/**
 * Search, category and price filters and sorting for product listings.
 * Everything lives in the URL; the page re-renders on the server with the
 * filtered products.
 */
export function FilterBar({ categories, showCategoryFilter = true, resultCount }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const filters = parseProductFilters(Object.fromEntries(searchParams.entries()));
  const [menu, setMenu] = useState<Menu>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Search box: typed text, synced back when the URL changes (back button,
  // Reset, header search).
  const [query, setQuery] = useState(filters.q);
  const [urlQuery, setUrlQuery] = useState(filters.q);
  if (filters.q !== urlQuery) {
    setUrlQuery(filters.q);
    setQuery(filters.q);
  }

  // Custom price inputs.
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");

  const navigate = (patch: Record<string, string | null>, replace = false) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;

    startTransition(() => {
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  };

  // Search as you type (debounced). Replace, so each keystroke isn't a
  // history entry.
  useEffect(() => {
    if (query.trim() === filters.q) return;

    const timer = setTimeout(() => navigate({ q: query.trim() || null }, true), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Close menus on outside click / Escape.
  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const toggleMenu = (next: Menu) => {
    if (next === "price" && menu !== "price") {
      setMinInput(filters.min !== null ? String(filters.min) : "");
      setMaxInput(filters.max !== null ? String(filters.max) : "");
    }
    setMenu(menu === next ? null : next);
  };

  const toggleCategory = (slug: string) => {
    const selected = new Set(filters.categories);
    if (selected.has(slug)) selected.delete(slug);
    else selected.add(slug);
    navigate({ category: [...selected].join(",") || null });
  };

  const setPrice = (min: number | null, max: number | null) => {
    navigate({ min: min !== null ? String(min) : null, max: max !== null ? String(max) : null });
    setMenu(null);
  };

  const applyCustomPrice = () => {
    let min = parseWholeNumber(minInput);
    let max = parseWholeNumber(maxInput);
    if (min !== null && max !== null && min > max) [min, max] = [max, min];
    setPrice(min, max);
  };

  const resetAll = () => {
    setQuery("");
    navigate({ q: null, category: null, min: null, max: null });
  };

  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const priceLabel = priceRangeLabel(filters.min, filters.max);
  const sortLabel = SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ?? "Newest";
  const visibleCategories = showCategoryFilter ? filters.categories : [];
  const filtered = hasActiveFilters({ ...filters, categories: visibleCategories });

  const chipClass = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${
      active
        ? "border-[#003d29] bg-[#003d29] text-white"
        : "border-border bg-surface text-foreground hover:border-foreground/40"
    }`;

  const menuClass =
    "absolute z-30 mt-2 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-background p-2 shadow-xl";

  const optionClass =
    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface";

  return (
    <div ref={barRef} className="relative z-20 space-y-4">
      {/* Search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate({ q: query.trim() || null }, true);
            }}
            placeholder="Search products"
            maxLength={60}
            aria-label="Search products"
            className="w-full rounded-full border border-border bg-surface py-2.5 pl-11 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#003d29]/20"
          />
          {pending ? (
            <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
          ) : (
            query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  navigate({ q: null }, true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )
          )}
        </div>

        {/* Sort */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => toggleMenu("sort")}
            aria-expanded={menu === "sort"}
            className="flex w-full items-center justify-between gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-xs font-semibold sm:w-auto"
          >
            <span>
              Sort by: <span className="font-bold text-[#058e60]">{sortLabel}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted" />
          </button>

          {menu === "sort" && (
            <div className={`${menuClass} right-0 w-56`}>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    navigate({ sort: option.value === "newest" ? null : option.value });
                    setMenu(null);
                  }}
                  className={optionClass}
                >
                  {option.label}
                  {filters.sort === option.value && <Check className="h-4 w-4 text-[#058e60]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        {showCategoryFilter && categories.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu("category")}
              aria-expanded={menu === "category"}
              className={chipClass(filters.categories.length > 0)}
            >
              {filters.categories.length === 0
                ? "Category"
                : filters.categories.length === 1
                  ? categoryName(filters.categories[0])
                  : `${filters.categories.length} categories`}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {menu === "category" && (
              <div className={`${menuClass} left-0 max-h-80 w-64 overflow-y-auto`}>
                {categories.map((category) => {
                  const checked = filters.categories.includes(category.slug);

                  return (
                    <label key={category.slug} className={`${optionClass} cursor-pointer`}>
                      <span>{category.name}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(category.slug)}
                        className="h-4 w-4 accent-[#003D29]"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu("price")}
            aria-expanded={menu === "price"}
            className={chipClass(priceLabel !== null)}
          >
            {priceLabel ?? "Price"}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {menu === "price" && (
            <div className={`${menuClass} left-0 w-72`}>
              {PRICE_RANGES.map((range) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => setPrice(range.min, range.max)}
                  className={optionClass}
                >
                  {range.label}
                  {filters.min === range.min && filters.max === range.max && (
                    <Check className="h-4 w-4 text-[#058e60]" />
                  )}
                </button>
              ))}

              <form
                className="mt-2 border-t border-border px-3 pb-1 pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  applyCustomPrice();
                }}
              >
                <p className="text-xs font-semibold text-muted">Custom range (₹)</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={minInput}
                    onChange={(e) => setMinInput(e.target.value.replace(/\D/g, "").slice(0, 7))}
                    placeholder="Min"
                    aria-label="Minimum price"
                    className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                  />
                  <span className="text-muted">–</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxInput}
                    onChange={(e) => setMaxInput(e.target.value.replace(/\D/g, "").slice(0, 7))}
                    placeholder="Max"
                    aria-label="Maximum price"
                    className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg bg-[#003d29] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Apply
                  </button>
                </div>
              </form>

              {priceLabel && (
                <button
                  type="button"
                  onClick={() => setPrice(null, null)}
                  className="mt-1 w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-surface"
                >
                  Clear price
                </button>
              )}
            </div>
          )}
        </div>

        {filtered && (
          <button type="button" onClick={resetAll} className="px-2 text-xs font-semibold text-rose-600 hover:underline">
            Reset all
          </button>
        )}

        <span className="ml-auto text-xs text-muted" aria-live="polite">
          {resultCount} {resultCount === 1 ? "product" : "products"}
        </span>
      </div>

      {/* Active filters */}
      {filtered && (
        <div className="flex flex-wrap gap-2">
          {filters.q && (
            <ActiveChip label={`“${filters.q}”`} onRemove={() => { setQuery(""); navigate({ q: null }); }} />
          )}
          {visibleCategories.map((slug) => (
            <ActiveChip key={slug} label={categoryName(slug)} onRemove={() => toggleCategory(slug)} />
          ))}
          {priceLabel && <ActiveChip label={priceLabel} onRemove={() => setPrice(null, null)} />}
        </div>
      )}
    </div>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs font-medium">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted hover:text-foreground"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
