"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, AlertTriangle } from "lucide-react";
import { useCartStore } from "@/features/cart/store/cartStore";
import { useCartQuote } from "@/features/cart/hooks/useCartQuote";
import { CartSummary } from "@/features/cart/components/CartSummary";
import { CouponBox } from "@/features/cart/components/CouponBox";
import { CartItemCustomization } from "@/features/cart/components/CartItemCustomization";
import { formatINR } from "@/lib/shop-config";
import { useShopSettings } from "@/components/providers/ShopSettingsProvider";

export default function CartPage() {
  const { increase, decrease, remove } = useCartStore();
  const { hydrated, items, quote, error, loading } = useCartQuote();
  const { lowStockThreshold, maxQtyPerItem } = useShopSettings();

  const unavailable = new Set(quote?.unavailable ?? []);
  const outOfStock = new Set(quote?.outOfStock ?? []);
  const lineByKey = new Map((quote?.lines ?? []).map((line) => [line.lineKey, line]));
  const invalidByKey = new Map((quote?.invalid ?? []).map((entry) => [entry.lineKey, entry.errors]));
  const blockedCount = unavailable.size + outOfStock.size + invalidByKey.size;
  const canCheckout = !!quote && !loading && !error && blockedCount === 0 && quote.lines.length > 0;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">Cart</span>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <ShoppingBag className="h-7 w-7" />
          <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">Shopping Cart</h1>
        </div>

        {!hydrated ? null : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-6 text-2xl font-semibold">Your cart is empty</h2>
            <p className="mt-2 text-muted-foreground">Looks like you haven&apos;t added anything yet.</p>

            <Link
              href="/products"
              className="mt-6 rounded-full bg-foreground px-6 py-3 font-medium text-background"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8 [&>*]:min-w-0">
            {/* LEFT */}
            <div className="rounded-3xl border border-border bg-surface">
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-semibold">Cart Items ({items.length})</h2>
              </div>

              {blockedCount > 0 && (
                <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Some items are out of stock, no longer available or need new personalisation details.
                  Remove them to continue.
                </div>
              )}

              <div className="divide-y divide-border">
                {items.map((item) => {
                  const isOutOfStock = outOfStock.has(item.lineKey);
                  const customizationErrors = invalidByKey.get(item.lineKey);
                  const isUnavailable = unavailable.has(item.lineKey) || isOutOfStock || !!customizationErrors;
                  // null = no stock limit ('continue selling' products)
                  const available = lineByKey.get(item.lineKey)?.available ?? null;
                  const maxQuantity = Math.min(maxQtyPerItem, available ?? maxQtyPerItem);

                  return (
                    <div
                      key={item.lineKey}
                      className={`flex gap-4 p-4 sm:p-6 ${isUnavailable ? "opacity-60" : ""}`}
                    >
                      <div className="relative h-28 w-24 overflow-hidden rounded-xl bg-background sm:h-32 sm:w-28">
                        {item.image && (
                          <Image src={item.image} alt={item.title} fill sizes="112px" className="object-cover" />
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          {item.href ? (
                            <Link href={item.href} className="text-lg font-semibold hover:underline">
                              {item.title}
                            </Link>
                          ) : (
                            <h3 className="text-lg font-semibold">{item.title}</h3>
                          )}

                          {item.variantTitle && <p className="text-sm text-muted-foreground">{item.variantTitle}</p>}

                          <CartItemCustomization
                            entries={item.customizationDisplay}
                            errors={customizationErrors}
                            className="mt-1.5"
                          />

                          <p className="mt-1 text-sm text-muted-foreground">
                            {isUnavailable ? (
                              <span className="font-medium text-red-600">
                                {isOutOfStock
                                  ? "Out of stock"
                                  : customizationErrors
                                    ? "Remove and add it again from the product page"
                                    : "No longer available"}
                              </span>
                            ) : (
                              `${formatINR(item.price)} each`
                            )}
                          </p>

                          {!isUnavailable && available !== null && available <= lowStockThreshold && (
                            <p className="mt-1 text-xs font-medium text-amber-600">Only {available} left</p>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                          {/* Quantity */}
                          <div className="flex items-center rounded-full border border-border">
                            <button
                              onClick={() => decrease(item.lineKey)}
                              className="rounded-full p-2 hover:bg-background"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </button>

                            <span className="w-10 text-center font-medium">{item.quantity}</span>

                            <button
                              onClick={() => increase(item.lineKey)}
                              disabled={isUnavailable || item.quantity >= maxQuantity}
                              className="rounded-full p-2 hover:bg-background disabled:opacity-40"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-4">
                            {!isUnavailable && (
                              <span className="text-lg font-bold">
                                {formatINR(item.price * item.quantity)}
                              </span>
                            )}

                            <button
                              onClick={() => remove(item.lineKey)}
                              className="text-muted-foreground transition hover:text-red-500"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border p-6">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-sm font-medium transition hover:text-brand"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Continue Shopping
                </Link>
              </div>
            </div>

            {/* RIGHT SUMMARY */}
            <aside className="h-fit rounded-3xl border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-24">
              <h2 className="mb-6 text-xl font-bold">Order Summary</h2>

              <div className="mb-6">
                <CouponBox quote={quote} loading={loading} />
              </div>

              <CartSummary quote={quote} loading={loading} />

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              {canCheckout ? (
                <Link
                  href="/checkout"
                  className="mt-6 flex w-full items-center justify-center rounded-full bg-[#003D29] py-3 font-semibold text-white transition hover:bg-[#002B1D]"
                >
                  Proceed to Checkout
                </Link>
              ) : (
                <button
                  disabled
                  className="mt-6 w-full cursor-not-allowed rounded-full bg-[#003D29] py-3 font-semibold text-white opacity-50"
                >
                  Proceed to Checkout
                </button>
              )}

              <p className="mt-4 text-center text-xs text-muted-foreground">Secure payments powered by Razorpay</p>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
