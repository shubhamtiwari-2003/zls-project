"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useState } from "react";

export interface ProductItem {
  id: string;
  slug?: string;
  title: string;
  description: string;
  price: number;
  rating: number;
  reviewCount: number;
  imageUrl: string; 
  isPopular?: boolean;
  category:string;
}

export function ProductCard({ product }: { product: ProductItem }) {
  const [isLiked, setIsLiked] = useState(false);
  const href = `/products/${product.category}/${product.slug}`;

  const [rupees, paise] = product.price.toFixed(2).split(".");

  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:shadow-lg">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#F5F6F6]">
        <Link href={href}>
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw"
          />
        </Link>

        {/* Wishlist */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsLiked(!isLiked);
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-sm transition hover:scale-105"
        >
          <Heart
            className={`h-4 w-4 transition ${isLiked
              ? "fill-rose-500 text-rose-500"
              : "text-zinc-500"
              }`}
          />
        </button>

        {/* Badge */}
        {product.isPopular && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-white">
            Trending
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-2 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground transition group-hover:text-accent sm:text-base">
              {product.title}
            </h3>
          </Link>

          <div className="shrink-0 text-right bg-amber-800 text-white rounded-md px-1">
            <span className="text-xs font-bold sm:text-base">
              ₹{rupees}
              <span className="text-xs font-bold sm:text-base">.{paise}</span>
            </span>
          </div>
        </div>

        <p className="line-clamp-1 text-xs text-foreground  sm:text-sm">
          {product.description}
        </p>

        <button className="mt-1 mx-auto rounded-full bg-[#003D29] px-4 py-2.5 text-xs md:text-sm font-medium text-white transition hover:bg-[#002B1D]">
          Add to Cart
        </button>
      </div>
    </div>
  );
}