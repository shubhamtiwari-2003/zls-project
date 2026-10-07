"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

interface ProductGalleryProps {
  images: { url: string; alt: string }[];
  name: string;
  // Controlled by the product view, so choosing a variant can switch the image.
  selected: number;
  onSelect: (index: number) => void;
}

// How long scrolling must be quiet before a swipe counts as settled.
const SCROLL_SETTLE_MS = 120;

/**
 * Main image is a horizontal scroll-snap strip: swipe on touch screens,
 * arrows/thumbnails/dots everywhere. The strip and `selected` stay in sync
 * both ways.
 */
export function ProductGallery({ images, name, selected, onSelect }: ProductGalleryProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while we scroll the strip ourselves (so it isn't read as a swipe).
  const programmatic = useRef(false);

  const count = images.length;
  const index = count ? Math.min(Math.max(selected, 0), count - 1) : 0;

  const visibleIndex = () => {
    const strip = stripRef.current;
    if (!strip || strip.clientWidth === 0) return index;
    return Math.round(strip.scrollLeft / strip.clientWidth);
  };

  // `selected` changed (variant, thumbnail, arrow): slide the strip there.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || visibleIndex() === index) return;

    programmatic.current = true;
    strip.scrollTo({ left: index * strip.clientWidth, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  // A swipe settled on a new image: report it.
  const handleScroll = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);

    settleTimer.current = setTimeout(() => {
      const settled = visibleIndex();
      const wasProgrammatic = programmatic.current;
      programmatic.current = false;

      // Our own slide reached its target: nothing to report.
      if (wasProgrammatic && settled === index) return;

      // Otherwise the user swiped (possibly interrupting our slide).
      if (settled !== index && settled >= 0 && settled < count) onSelect(settled);
    }, SCROLL_SETTLE_MS);
  };

  if (count === 0) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-border bg-surface text-muted-foreground sm:rounded-3xl">
        <ImageIcon size={40} />
        <p className="mt-2 text-sm">No image available</p>
      </div>
    );
  }

  const go = (delta: number) => onSelect((index + delta + count) % count);

  return (
    <div>
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface sm:rounded-3xl">
        <div
          ref={stripRef}
          onScroll={handleScroll}
          role="region"
          aria-roledescription="carousel"
          aria-label={`${name} images`}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <div
              key={image.url}
              className="relative aspect-square w-full shrink-0 snap-center snap-always"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={i !== index}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain p-4"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            {/* Arrows: desktop (touch users swipe) */}
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-background/80 p-2 opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100 sm:block"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-background/80 p-2 opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100 sm:block"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>

            {/* Counter: phones */}
            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white sm:hidden">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <>
          {/* Dots: phones */}
          <div className="mt-3 flex justify-center gap-1.5 sm:hidden" aria-hidden="true">
            {images.map((image, i) => (
              <span
                key={image.url}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-foreground" : "w-1.5 bg-border"}`}
              />
            ))}
          </div>

          {/* Thumbnails */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:mt-4 sm:gap-3">
            {images.map((image, i) => (
              <button
                key={image.url}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Show image ${i + 1} of ${name}`}
                aria-current={index === i}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-24 sm:w-24 ${
                  index === i ? "border-foreground" : "border-border opacity-70 hover:opacity-100"
                }`}
              >
                <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
