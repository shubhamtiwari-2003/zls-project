// src/features/cart/components/CartDrawer.tsx
"use client";

import { X, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { itemLimit, useCartStore } from "@/features/cart/store/cartStore";
import { useCartQuote } from "@/features/cart/hooks/useCartQuote";
import { CartItemCustomization } from "@/features/cart/components/CartItemCustomization";
import { useHydrated } from "@/hooks/useHydrated";
import { LOW_STOCK_THRESHOLD, formatINR } from "@/lib/shop-config";

// Re-prices the cart while the drawer is open, which also refreshes each
// item's stock limit and trims quantities that exceed it.
function RefreshCartStock() {
  useCartQuote();
  return null;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const hydrated = useHydrated();
  const { items, increase, decrease, remove } = useCartStore();

  if (!isOpen) return null;

  const cartItems = hydrated ? items : [];

  // Estimate from cached prices; the cart/checkout pages show server totals.
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <RefreshCartStock />

      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="flex w-screen max-w-md flex-col justify-between bg-surface text-foreground shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">Your Cart ({cartItems.length})</h2>
            <button onClick={onClose} className="p-1 text-muted hover:text-foreground" aria-label="Close cart">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cartItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <ShoppingBag className="h-12 w-12 text-muted" />
                <p className="mt-4 text-muted">Your cart is currently empty.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {cartItems.map((item) => (
                  <li key={item.lineKey} className="flex gap-4 py-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-background">
                      {item.image && (
                        <Image src={item.image} alt={item.title} fill sizes="80px" className="object-cover" />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium">{item.title}</h3>
                          {item.variantTitle && <p className="text-xs text-muted">{item.variantTitle}</p>}
                          <CartItemCustomization entries={item.customizationDisplay} className="mt-1" />
                          {item.maxQuantity != null && item.maxQuantity <= LOW_STOCK_THRESHOLD && (
                            <p className="mt-0.5 text-xs font-medium text-amber-600">
                              {item.maxQuantity <= 0 ? "Out of stock" : `Only ${item.maxQuantity} left`}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-semibold">{formatINR(item.price * item.quantity)}</p>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        {/* Quantity Controls */}
                        <div className="flex items-center rounded-md border border-border">
                          <button
                            onClick={() => decrease(item.lineKey)}
                            className="p-1 text-muted hover:text-foreground"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-2 text-xs font-medium">{item.quantity}</span>
                          <button
                            onClick={() => increase(item.lineKey)}
                            disabled={item.quantity >= itemLimit(item)}
                            className="p-1 text-muted hover:text-foreground disabled:opacity-40"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => remove(item.lineKey)}
                          className="text-muted transition hover:text-rose-600"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer / Summary */}
          {cartItems.length > 0 && (
            <div className="space-y-3 border-t border-border p-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold">{formatINR(subtotal)}</span>
              </div>
              <p className="text-xs text-muted">Shipping and final total are calculated at checkout.</p>

              <Link
                href="/cart"
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-full border border-border py-3 text-sm font-medium hover:bg-background"
              >
                View Cart
              </Link>

              <Link
                href="/checkout"
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-full bg-[#058e60] py-3 text-sm font-medium text-white hover:bg-[#002B1D]"
              >
                Checkout
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
