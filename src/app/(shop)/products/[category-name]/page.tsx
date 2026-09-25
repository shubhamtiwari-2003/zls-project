"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/features/products/components/ProductCard";
import Breadcrumb from "@/components/shared/Breadcrumb";
import postersBanner from "../../../../../public/poster-banner.png";
import onepiece from "../../../../../public/onepices.jpg"; 
import batman from "../../../../../public/batman.jpg";
import spiderman from "../../../../../public/spiderman.jpg";
import ironman from "../../../../../public/ironman.jpg";
import cyberpunk from "../../../../../public/cyberpunk.jpg";
import jjk from "../../../../../public/jjk.jpg";



const products = [
  {
    id: "1",
    slug: "batman-knight",
    title: "Batman Knight Poster",
    description: "Premium cinematic glass frame wall poster",
    price: 649,
    rating: 4.9,
    reviewCount: 124,
    imageUrl: batman.src,
    isPopular: true,
    category:"posters",
  },
  {
    id: "2",
    slug: "spiderman-neon",
    title: "Spider-Man Neon",
    description: "Modern superhero wall art",
    price: 649,
    rating: 4.8,
    reviewCount: 98,
    imageUrl: spiderman.src,
    category:"posters",
  },
  {
    id: "3",
    slug: "ironman-legacy",
    title: "Iron Man Legacy",
    description: "Minimal premium glass poster",
    price: 629,
    rating: 4.9,
    reviewCount: 81,
    imageUrl: ironman.src,
  category:"posters",
  },
  {
    id: "4",
    slug: "cyberpunk-city",
    title: "Cyberpunk City",
    description: "Futuristic neon aesthetic poster",
    price: 699,
    rating: 5,
    reviewCount: 42,
    imageUrl: cyberpunk.src,
    category:"posters",
  },
  {
    id: "5",
    slug: "onepiece-vintage",
    title: "One Piece Vintage",
    description: "Anime collectible wall poster",
    price: 579,
    rating: 4.8,
    reviewCount: 73,
    imageUrl: onepiece.src,
    category:"posters",
  },
  {
    id: "6",
    slug: "jjk-shadow",
    title: "JJK Shadow Edition",
    description: "Dark anime premium poster",
    price: 599,
    rating: 4.7,
    reviewCount: 66,
    imageUrl: jjk.src,
    category:"posters",
  },
];

export default function PostersPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* HERO BANNER */}
      <section className="relative h-[280px] sm:h-[360px] lg:h-[460px] overflow-hidden">
        <Image
          src={postersBanner.src}
          alt="Premium Posters Collection"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 flex items-center">
          <div className="max-w-2xl text-white">
            <span className="inline-block rounded-full bg-white/15 backdrop-blur px-4 py-1 text-xs font-medium">
              Premium Collection
            </span>

            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Posters Collection
            </h1>

            <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed">
              Discover handcrafted glass-frame posters inspired by superheroes,
              anime, movies and modern minimal art.
            </p>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <Breadcrumb/>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              All Posters
            </h2>
            <p className="mt-2 text-muted max-w-xl">
              Premium quality wall posters printed with vibrant colors and
              available with elegant glass framing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">
              {products.length} Products
            </span>

            <select className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none">
              <option>Newest</option>
              <option>Best Selling</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Load More */}
        <div className="flex justify-center mt-12">
          <button className="rounded-full border border-border px-8 py-3 text-sm font-medium hover:bg-surface-secondary transition">
            Load More
          </button>
        </div>
      </section>
    </main>
  );
}