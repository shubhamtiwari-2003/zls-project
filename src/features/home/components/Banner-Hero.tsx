"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { isExternalLink, type Promotion } from "@/lib/promotions";
import banner from "../../../../public/hero-image2.png";

/*
  Homepage carousel. Slides come from live campaigns (Admin → Promotions →
  Homepage banners). With no campaign running, the default slide shows.

  A slide with a title gets the text over a dark overlay. Without a title
  the image is shown as it is (for banners designed with their own text)
  and the whole slide is the link.
*/

interface Slide {
  id: string;
  tag: string | null;
  title: string | null;
  subtitle: string | null;
  ctaText: string | null;
  link: string | null;
  image: string;
  mobileImage: string | null;
}

const DEFAULT_SLIDE: Slide = {
  id: "default",
  tag: "Z Factor Studio",
  title: "Personalised gifts, made to order",
  subtitle: "Name keychains, photo frames and more, designed by you and made by us.",
  ctaText: "Shop all products",
  link: "/products",
  image: banner.src,
  mobileImage: null,
};

const toSlide = (promotion: Promotion): Slide => ({
  id: promotion.id,
  tag: promotion.tag,
  title: promotion.title,
  subtitle: promotion.body,
  ctaText: promotion.cta_label,
  link: promotion.link_url,
  image: promotion.image_url!,
  mobileImage: promotion.mobile_image_url,
});

const SLIDE_MS = 5000;

export function BannerHero({ banners = [] }: { banners?: Promotion[] }) {
  const slides = banners.length ? banners.map(toSlide) : [DEFAULT_SLIDE];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const count = slides.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  };

  // Auto-advance every 5 seconds unless hovered.
  useEffect(() => {
    if (isPaused || count < 2) return;
    const interval = setInterval(nextSlide, SLIDE_MS);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, count]);

  return (
    <section
      className="w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label="Highlighted Promotions"
    >
      <div className="relative group w-full overflow-hidden rounded-b-3xl min-h-[460px] sm:min-h-[500px] lg:min-h-[520px] shadow-xs">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          const external = slide.link ? isExternalLink(slide.link) : false;

          const images = (
            <>
              <Image
                src={slide.image}
                alt={slide.title ?? slide.tag ?? "Promotion"}
                fill
                priority={idx === 0}
                className={`object-cover ${slide.mobileImage ? "hidden sm:block" : ""}`}
                sizes="100vw"
              />
              {slide.mobileImage && (
                <Image
                  src={slide.mobileImage}
                  alt={slide.title ?? slide.tag ?? "Promotion"}
                  fill
                  priority={idx === 0}
                  className="object-cover sm:hidden"
                  sizes="100vw"
                />
              )}
            </>
          );

          return (
            <div
              key={slide.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-700 ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Image-only banner: the whole slide is the link. */}
              {!slide.title ? (
                slide.link ? (
                  <Link
                    href={slide.link}
                    tabIndex={isActive ? undefined : -1}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    className="absolute inset-0"
                  >
                    {images}
                  </Link>
                ) : (
                  images
                )
              ) : (
                <>
                  {images}

                  {/* Dark overlay keeps the text readable on any image. */}
                  <div className="absolute inset-0 bg-black/45" />

                  <div className="relative z-10 flex h-full items-center px-6 sm:px-12 lg:px-20">
                    <div className="max-w-xl">
                      {slide.tag && (
                        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold mb-4 bg-white/20 text-white backdrop-blur-xs">
                          {slide.tag}
                        </span>
                      )}

                      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">{slide.title}</h1>

                      {slide.subtitle && (
                        <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed">{slide.subtitle}</p>
                      )}

                      {slide.link && slide.ctaText && (
                        <Link
                          href={slide.link}
                          tabIndex={isActive ? undefined : -1}
                          target={external ? "_blank" : undefined}
                          rel={external ? "noreferrer" : undefined}
                          className="mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold transition bg-brand hover:bg-brand-hover text-white"
                        >
                          {slide.ctaText}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {count > 1 && (
          <>
            {/* Carousel Navigation Arrows */}
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous Slide"
              className="absolute opacity-5 group-hover:opacity-75 cursor-pointer left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/70 hover:bg-white text-zinc-800 flex items-center justify-center shadow-md backdrop-blur-xs transition hover:scale-105"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next Slide"
              className="absolute opacity-5 group-hover:opacity-75 cursor-pointer right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/70 hover:bg-white text-zinc-800 flex items-center justify-center shadow-md backdrop-blur-xs transition hover:scale-105"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Bottom Pagination Indicator Bars */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  aria-label={`Jump to slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentIndex === i ? "w-8 bg-brand" : "w-2.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
