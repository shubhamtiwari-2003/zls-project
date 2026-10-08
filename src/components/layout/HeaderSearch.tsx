"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { formatINR } from "@/lib/shop-config";
import type { SearchSuggestion } from "@/types/search";

interface HeaderSearchProps {
  autoFocus?: boolean;
  // Called after navigating (closes the phone search bar).
  onNavigate?: () => void;
  className?: string;
}

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

const searchUrl = (q: string) => (q ? `/products?q=${encodeURIComponent(q)}` : "/products");

/**
 * Header search: product suggestions as you type, ↑/↓ + Enter to pick,
 * Enter on its own (or "See all results") opens the products page search.
 */
export function HeaderSearch({ autoFocus, onNavigate, className = "" }: HeaderSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // On the products pages, show what was searched for.
  const urlQuery = pathname.startsWith("/products") ? searchParams.get("q") ?? "" : "";
  const [query, setQuery] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [results, setResults] = useState<{ q: string; items: SearchSuggestion[]; failed: boolean } | null>(null);

  // Close after navigating anywhere.
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const trimmed = query.trim();
  const searchable = trimmed.length >= MIN_CHARS;
  const current = searchable && results?.q === trimmed ? results : null;
  const loading = searchable && !current;
  const items = current?.items ?? [];

  // Fetch suggestions (debounced; stale requests cancelled).
  useEffect(() => {
    if (!searchable) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const data = await response.json();
        setResults({ q: trimmed, items: response.ok ? data.results ?? [] : [], failed: !response.ok });
      } catch {
        if (!controller.signal.aborted) setResults({ q: trimmed, items: [], failed: true });
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmed, searchable]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const finish = () => {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    onNavigate?.();
  };

  const goToResults = () => {
    router.push(searchUrl(trimmed));
    finish();
  };

  // ↑/↓ move over the suggestions and the "See all results" row.
  const optionCount = searchable ? items.length + 1 : 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!optionCount) return;
      e.preventDefault();
      setOpen(true);
      setActive((index) => {
        const next = index + (e.key === "ArrowDown" ? 1 : -1);
        return next < 0 ? optionCount - 1 : next >= optionCount ? 0 : next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && active < items.length) {
        router.push(items[active].href);
        finish();
      } else {
        goToResults();
      }
    } else if (e.key === "Escape") {
      if (open) setOpen(false);
      else inputRef.current?.blur();
    }
  };

  const showPanel = open && searchable;
  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          goToResults();
        }}
      >
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          maxLength={60}
          placeholder="Search products"
          aria-label="Search products"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && active >= 0 ? optionId(active) : undefined}
          className="w-full rounded-full border-none bg-muted py-2.5 pl-5 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 [&::-webkit-search-cancel-button]:hidden"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActive(-1);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="submit"
          aria-label="Search"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      {/* Suggestions */}
      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
          <ul id={listId} role="listbox" aria-label="Product suggestions" className="max-h-[60vh] overflow-y-auto py-1">
            {loading && (
              <li className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </li>
            )}

            {current?.failed && (
              <li className="px-4 py-3 text-sm text-muted-foreground">Couldn&apos;t load suggestions. Press Enter to search.</li>
            )}

            {current && !current.failed && items.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                No products match &ldquo;{trimmed}&rdquo;.
              </li>
            )}

            {items.map((item, index) => (
              <li key={item.id} id={optionId(index)} role="option" aria-selected={active === index}>
                <Link
                  href={item.href}
                  onClick={finish}
                  onMouseEnter={() => setActive(index)}
                  className={`flex items-center gap-3 px-3 py-2 ${active === index ? "bg-muted" : ""}`}
                >
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
                    {item.image && <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    {item.category && <span className="block truncate text-xs text-muted-foreground">{item.category}</span>}
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold">
                    {formatINR(item.price)}
                    {item.compareAtPrice && item.compareAtPrice > item.price && (
                      <s className="block text-xs font-normal text-muted-foreground">{formatINR(item.compareAtPrice)}</s>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            id={optionId(items.length)}
            role="option"
            aria-selected={active === items.length}
            onClick={goToResults}
            onMouseEnter={() => setActive(items.length)}
            className={`flex w-full items-center justify-between gap-2 border-t border-border px-4 py-3 text-left text-sm font-medium text-brand-bright ${
              active === items.length ? "bg-muted" : ""
            }`}
          >
            <span className="truncate">See all results for &ldquo;{trimmed}&rdquo;</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Shown while the search box loads (it reads the URL). */
export function HeaderSearchFallback({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="h-10 w-full rounded-full bg-muted" />
    </div>
  );
}
