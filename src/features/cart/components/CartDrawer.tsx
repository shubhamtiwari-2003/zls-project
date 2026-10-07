// src/features/cart/components/CartDrawer.tsx
"use client";

import { BadgePercent, Trash2, Plus, Minus, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { itemLimit, useCartStore } from "@/features/cart/store/cartStore";
import { useCartQuote } from "@/features/cart/hooks/useCartQuote";
import { CartItemCustomization } from "@/features/cart/components/CartItemCustomization";
import { FreeShippingProgress } from "@/features/cart/components/FreeShippingProgress";
import { useHydrated } from "@/hooks/useHydrated";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatINR } from "@/lib/shop-config";
import { useShopSettings } from "@/components/providers/ShopSettingsProvider";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

// Re-prices the cart while the drawer is open (which also refreshes each
// item's stock limit and trims quantities that exceed it), and shows the
// applied coupon. Coupons are entered on the cart page or at checkout.
function DrawerCouponLine() {
  const { quote } = useCartQuote();

  if (quote?.coupon && quote.discount > 0) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-green-700 dark:text-green-400">
        <BadgePercent className="h-3.5 w-3.5" />
        Coupon {quote.coupon.code} applied: −{formatINR(quote.discount)} at checkout
      </p>
    );
  }

  return <p className="text-center text-xs text-muted-foreground">Have a coupon? Apply it at checkout</p>;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/*
  Side cart (shadcn Drawer, Base UI): slides in from the right on desktop,
  up from the bottom on phones with a handle to swipe it away.
*/
export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const hydrated = useHydrated();
  const isMobile = useIsMobile();
  const { lowStockThreshold, maxQtyPerItem } = useShopSettings();
  const { items, increase, decrease, remove } = useCartStore();

  const cartItems = hydrated ? items : [];
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Estimate from cached prices; the cart/checkout pages show server totals.
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? "down" : "right"}
    >

      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:28rem]">
        <DrawerHeader className="flex-row items-start justify-between gap-4 border-b border-border pb-4 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <div>
            <DrawerTitle className="text-lg font-semibold">Your Cart</DrawerTitle>
            <DrawerDescription>
              {itemCount === 0 ? "Nothing here yet." : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            </DrawerDescription>
          </div>

          {/* Phones close by swiping down. */}
          {!isMobile && (
            <DrawerClose
              render={
                <Button variant="ghost" size="icon" aria-label="Close cart" className="-mr-2 -mt-1 rounded-full">
                  <X />
                </Button>
              }
            />
          )}
        </DrawerHeader>

        {/* Free delivery progress */}
        <FreeShippingProgress subtotal={subtotal} className="mx-4 mt-4 shrink-0" />

        {/* Items */}
        <div className="scroll-fade min-h-0 flex-1 overflow-y-auto px-4">
          {cartItems.length === 0 ? (
            <div className="flex h-full min-h-60 flex-col items-center justify-center py-10 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Your cart is currently empty.</p>
              <Button asChild variant="outline" className="mt-6 rounded-full">
                <Link href="/products" onClick={onClose}>
                  Browse products
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {cartItems.map((item) => (
                <li key={item.lineKey} className="flex gap-4 py-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                    {item.image && (
                      <Image src={item.image} alt={item.title} fill sizes="80px" className="object-cover" />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        {item.href ? (
                          <Link href={item.href} onClick={onClose} className="text-sm font-medium hover:underline">
                            {item.title}
                          </Link>
                        ) : (
                          <h3 className="text-sm font-medium">{item.title}</h3>
                        )}
                        {item.variantTitle && <p className="text-xs text-muted-foreground">{item.variantTitle}</p>}
                        <CartItemCustomization entries={item.customizationDisplay} className="mt-1" />
                        {item.maxQuantity != null && item.maxQuantity <= lowStockThreshold && (
                          <p className="mt-0.5 text-xs font-medium text-amber-600">
                            {item.maxQuantity <= 0 ? "Out of stock" : `Only ${item.maxQuantity} left`}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-sm font-semibold">{formatINR(item.price * item.quantity)}</p>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {/* Quantity */}
                      <div className="flex items-center rounded-full border border-border">
                        <button
                          type="button"
                          onClick={() => decrease(item.lineKey)}
                          className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-xs font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => increase(item.lineKey)}
                          disabled={item.quantity >= itemLimit(item, maxQtyPerItem)}
                          className="rounded-full p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(item.lineKey)}
                        className="p-1 text-muted-foreground transition hover:text-rose-600"
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

        {/* Summary */}
        {cartItems.length > 0 && (
          <DrawerFooter className="gap-3 border-t border-border pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatINR(subtotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Shipping and final total are calculated at checkout.</p>

            <Button asChild className="h-11 rounded-full bg-[#058e60] text-white hover:bg-[#003D29]">
              <Link href="/checkout" onClick={onClose}>
                Checkout
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full">
              <Link href="/cart" onClick={onClose}>
                Cart Summary
              </Link>
            </Button>
            <DrawerCouponLine />
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
