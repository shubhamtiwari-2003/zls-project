"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/features/cart/store/cartStore";
import { announceAddedToCart } from "@/features/cart/lib/cartFeedback";
import { useHydrated } from "@/hooks/useHydrated";
import { useShopSettings } from "@/components/providers/ShopSettingsProvider";

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
  category: string;
  // Units purchasable now (all variants). null/undefined = no limit.
  stock?: number | null;
  // Set when the product has a single variant: it can be added from the card.
  variantId?: string | null;
  // Several variants: the customer picks one on the product page.
  hasOptions?: boolean;
  // Needs a name/photo etc.: personalised on the product page.
  isCustomizable?: boolean;
}

export function ProductCard({ product }: { product: ProductItem }) {
  const [liked, setLiked] = useState(false);
  const hydrated = useHydrated();
  const { lowStockThreshold, maxQtyPerItem } = useShopSettings();
  const { addItem, increase, decrease } = useCartStore();
  const variantId = product.variantId ?? null;
  const cartItem = useCartStore((state) =>
    variantId ? state.items.find((item) => item.lineKey === variantId) : undefined
  );
  const quantityInCart = hydrated ? cartItem?.quantity ?? 0 : 0;

  const stock = product.stock ?? null;
  const outOfStock = stock !== null && stock <= 0;
  const maxQuantity = Math.min(maxQtyPerItem, stock ?? maxQtyPerItem);

  const href = `/products/${product?.category?.trim().toLowerCase().replace(/\s+/g, "-")}/${product.slug}`;
  const [rupees, paise] = product.price.toFixed(2).split(".");

  return (
    <div data-product-card className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border sm:rounded-3xl border-border bg-surface transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
      {/* ---------------- Image ---------------- */}
      <div className="relative aspect-4/5 overflow-hidden bg-linear-to-br from-stone-100 to-stone-200 dark:from-zinc-900 dark:to-zinc-800">
        <Link href={href} className="block h-full w-full">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-100">
              <span className="text-sm text-neutral-400">
                No image
              </span>
            </div>
          )}
        </Link>

        {/* Category Badge */}
        <span className="absolute left-2 top-2 max-w-[calc(100%-3.5rem)] truncate rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white backdrop-blur sm:left-4 sm:top-4 sm:px-3 sm:py-1 sm:text-[10px]">
          {product.category}
        </span>

        {/* Wishlist */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setLiked(!liked);
          }}
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full sm:right-4 sm:top-4 sm:h-10 sm:w-10 bg-white/90 shadow-lg backdrop-blur transition hover:scale-110 dark:bg-black/50"
        >
          <Heart
            className={`h-4 w-4 transition ${liked
                ? "fill-rose-500 text-rose-500"
                : "text-zinc-600 dark:text-zinc-300"
              }`}
          />
        </button>
      </div>

      {/* ---------------- Content ---------------- */}
      <div className="flex flex-1 flex-col p-2 sm:p-4">
        {/* Rating */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
          <span className="font-medium text-foreground">
            {product.rating.toFixed(1)}
          </span>
          <span>({product.reviewCount})</span>
        </div>

        {/* Title */}
        <Link href={href}>
          <h3 className="mt-2 line-clamp-1 text-sm font-extrabold leading-5 text-foreground sm:min-h-9 sm:text-lg sm:leading-6 transition-colors group-hover:text-primary">
            {product.title}
          </h3>
        </Link>

        {/* Description */}
        <p className=" mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground sm:min-h-10.5 sm:text-sm sm:leading-5">
          {product.description}
        </p>

        {/* Price */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-2 gap-y-1 sm:mt-4">
          <div>
            <p className="text-xs text-muted-foreground">{product.hasOptions ? "Starting from" : "Price"}</p>

            <div className="flex items-end ">
              <span className="text-xl font-bold text-foreground sm:text-3xl">
                ₹{rupees}
              </span>
              <span className="pb-0.5 text-xs text-muted-foreground sm:pb-1 sm:text-sm">.{paise}</span>
            </div>
          </div>

          {outOfStock ? (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[8px] sm:px-2.5 sm:py-1 sm:text-[11px] font-medium text-red-600">
              Out of stock
            </span>
          ) : stock !== null && stock <= lowStockThreshold ? (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[8px] sm:px-2.5 sm:py-1 sm:text-[11px] font-medium text-amber-700 dark:text-amber-400">
              Only {stock} left
            </span>
          ) : (
            product.isPopular && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Bestseller
              </span>
            )
          )}
        </div>

        {/* CTA - Always Bottom */}
        <div className="mt-auto pt-3 sm:pt-4">
          {!variantId ? (
            // Several variants (or no data): choose on the product page.
            <Link
              href={href}
              className="flex  items-center justify-center gap-2 rounded-full border border-[#003D29] py-1 text-xs font-semibold text-foreground transition-all hover:bg-[#003D29] hover:text-white dark:border-emerald-700 sm:py-3 sm:text-sm"
            >
              {outOfStock
                ? "View product"
                : product.isCustomizable
                  ? "Personalise"
                  : product.hasOptions
                    ? "Choose options"
                    : "View product"}
            </Link>
          ) : quantityInCart > 0 ? (
            <div className="flex w-full items-center justify-between rounded-full border border-[#003D29] p-1">
              <button
                onClick={() => decrease(variantId)}
                className="rounded-full p-2 hover:bg-[#003D29]/10"
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span className="text-xs font-semibold sm:text-sm">{quantityInCart} in cart</span>
              <button
                onClick={() => increase(variantId)}
                disabled={quantityInCart >= maxQuantity}
                className="rounded-full p-2 hover:bg-[#003D29]/10 disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : outOfStock ? (
            <button
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-border py-2.5 text-xs font-semibold text-muted-foreground sm:py-3 sm:text-sm"
            >
              Out of stock
            </button>
          ) : (
            <button
              onClick={(e) => {
                addItem({
                  variantId,
                  productId: product.id,
                  title: product.title,
                  variantTitle: "",
                  price: product.price,
                  image: product.imageUrl,
                  href,
                  maxQuantity: stock,
                });
                announceAddedToCart({
                  title: product.title,
                  image: product.imageUrl,
                  imageElement: e.currentTarget.closest("[data-product-card]")?.querySelector("img"),
                  source: e.currentTarget,
                });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#003D29] py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#002B1D] active:scale-[0.98] sm:py-3 sm:text-sm"
            >
              <ShoppingBag size={16} />
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}