"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import banner from "../../../../public/hero-image2.png"


interface SlideData {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  ctaBg: string;
  imageUrl: string;
  imageAlt: string;
}

const SLIDES: SlideData[] = [
  {
    id: "slide-1",
    tag: "Limited Seasonal Deal",
    tagColor: "bg-emerald-500/20 text-emerald-900",
    title: "Grab Upto 50% Off On Selected Headphone",
    subtitle: "Experience high-fidelity wireless sound with ultra-low latency and active noise cancellation.",
    ctaText: "Buy Now",
    ctaLink: "/products?category=audio",
    ctaBg: "bg-[#003d29] hover:bg-[#002b1d] text-white",
    imageUrl: banner.src,
    imageAlt: "Premium Wireless Headphones",
  },
  {
    id: "slide-2",
    tag: "Department Highlights",
    tagColor: "bg-sky-500/20 text-sky-950",
    title: "Minimal Living & Designer Decor",
    subtitle: "Handcrafted ambient lighting and modern ceramics designed to elevate everyday workspaces.",
    ctaText: "Explore Collection",
    ctaLink: "/products?category=home-decor",
    ctaBg: "bg-zinc-900 hover:bg-zinc-800 text-white",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000&auto=format&fit=crop&q=80",
    imageAlt: "Modern Ambient Lighting",
  },
  {
    id: "slide-3",
    tag: "Festival Exclusive",
    tagColor: "bg-rose-500/20 text-rose-950",
    title: "Everyday Tech & Wearable Devices",
    subtitle: "Track your fitness, streamline notifications, and upgrade your daily productivity kit.",
    ctaText: "Shop Gadgets",
    ctaLink: "/products?category=wearables",
    ctaBg: "bg-[#872323] hover:bg-[#6c1c1c] text-white",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&auto=format&fit=crop&q=80",
    imageAlt: "Minimal Smartwatch Wearables",
  },
];

export function BannerHero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === SLIDES.length - 1 ? 0 : prev + 1));
  }, []);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
  };

  // Auto slider effect: cycles every 5 seconds unless paused by mouse hover
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  return (
    <section
      className="w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label="Highlighted Promotions"
    >
      <div className="relative group w-full overflow-hidden rounded-b-3xl min-h-[460px] sm:min-h-[500px] lg:min-h-[520px] shadow-xs">
        {/* Slides Track */}
        {SLIDES.map((slide, idx) => {
  const isActive = idx === currentIndex;

  return (
    <div
      key={slide.id}
      className={`absolute inset-0 transition-opacity duration-700 ${
        isActive
          ? "opacity-100 z-10"
          : "opacity-0 z-0 pointer-events-none"
      }`}
    >
      {/* Full Background Image */}
      <Image
        src={slide.imageUrl}
        alt={slide.imageAlt}
        fill
        priority={idx === 0}
        className="object-cover"
        sizes="100vw"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Content */}
      <div className="relative z-10 flex h-full items-center px-6 sm:px-12 lg:px-20">
        <div className="max-w-xl">
          <span
            className={`inline-block px-3.5 py-1 rounded-full text-xs font-semibold mb-4 ${slide.tagColor}`}
          >
            {slide.tag}
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            {slide.title}
          </h1>

          <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed">
            {slide.subtitle}
          </p>

          <Link
            href={slide.ctaLink}
            className={`mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold transition ${slide.ctaBg}`}
          >
            {slide.ctaText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
})}

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
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Jump to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex === i ? "w-8 bg-[#003d29]" : "w-2.5 bg-black/20 hover:bg-black/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}