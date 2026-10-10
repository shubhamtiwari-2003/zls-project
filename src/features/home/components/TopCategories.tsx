"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import type { CategoryTile } from "@/lib/catalog.server";

/*
  Homepage "Shop by category" carousel. Categories come from the database
  (getCategoryTiles). Swipe on phones; arrow buttons on larger screens.
  Native scroll-snap, so no carousel library is needed.

  Cards visible at once: ~2 on phones, 3 on tablets, 4 on desktop.
*/

export function TopCategories({ categories }: { categories: CategoryTile[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Arrows are enabled only when there's more to scroll that way.
  const updateArrows = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanPrev(track.scrollLeft > 4);
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    updateArrows();
    track.addEventListener("scroll", updateArrows, { passive: true });
    const observer = new ResizeObserver(updateArrows);
    observer.observe(track);

    return () => {
      track.removeEventListener("scroll", updateArrows);
      observer.disconnect();
    };
  }, [updateArrows]);

  // One "page" of cards at a time.
  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
  };

  if (categories.length === 0) return null;

  const showArrows = canPrev || canNext;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-10 sm:py-16 lg:px-16 xl:px-20" aria-labelledby="shop-by-category">
      <div className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
        <h2 id="shop-by-category" className="text-2xl font-bold tracking-tight text-brand-bright sm:text-4xl">
          Shop By Category
        </h2>

        {showArrows && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              disabled={!canPrev}
              aria-label="Previous categories"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30 sm:h-12 sm:w-12"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              disabled={!canNext}
              aria-label="More categories"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30 sm:h-12 sm:w-12"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      <ul
        ref={trackRef}
        className="grid snap-x snap-mandatory auto-cols-[calc((100%-0.75rem)/2.15)] grid-flow-col gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] sm:auto-cols-[calc((100%-2rem)/3)] sm:gap-4 lg:auto-cols-[calc((100%-3rem)/4)] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category, index) => (
          <li key={category.id} className="snap-start">
            <Link href={`/products/${category.slug}`} className="group block rounded-2xl outline-offset-4">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    priority={index < 4}
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 47vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <ImageOff className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
                )}

                {category.isNew && (
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-brand-bright px-3 py-1 text-[11px] font-semibold text-white shadow-sm sm:left-3 sm:top-3">
                    New Launch
                  </span>
                )}
              </div>

              <p className="mt-3 px-1 text-sm font-semibold text-foreground transition group-hover:text-brand-bright sm:text-base">
                {category.name}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
