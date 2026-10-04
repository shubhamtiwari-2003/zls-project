"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { itemLimit, useCartStore } from "@/features/cart/store/cartStore";
import { useHydrated } from "@/hooks/useHydrated";
import { LOW_STOCK_THRESHOLD, MAX_QTY_PER_ITEM } from "@/lib/shop-config";
import {
  cartLineKey,
  type CustomizationDisplay,
  type CustomizationValues,
} from "@/lib/customization";

interface ProductPurchasePanelProps {
  product: { id: string; name: string };
  // The selected variant (null = the chosen combination isn't sold).
  variant: {
    id: string;
    title: string;
    // Including personalisation add-ons.
    price: number;
    image: string;
    href: string;
    // Units purchasable now; null = unlimited.
    stock: number | null;
  } | null;
  // Products with personalisation (name, photo…).
  customization?: {
    // Checked values (only valid ones).
    values: CustomizationValues;
    display: CustomizationDisplay[];
    // Shows the form's errors; false = not ready to add.
    validate: () => boolean;
  };
}

// Re-mount with key={variant.id} so the quantity resets per variant.
export function ProductPurchasePanel({ product, variant, customization }: ProductPurchasePanelProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const addItem = useCartStore((state) => state.addItem);

  // This exact line (variant + personalisation), and the variant overall:
  // stock is shared by every personalised line of a variant.
  const lineKey = variant ? cartLineKey(variant.id, customization?.values) : null;
  const inCartLine = useCartStore((state) =>
    lineKey ? state.items.find((item) => item.lineKey === lineKey)?.quantity ?? 0 : 0
  );
  const inCartVariant = useCartStore((state) =>
    variant
      ? state.items
          .filter((item) => item.variantId === variant.id)
          .reduce((sum, item) => sum + item.quantity, 0)
      : 0
  );

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [added]);

  if (!variant) {
    return (
      <div className="mt-8">
        <button disabled className="w-full cursor-not-allowed rounded-full bg-border py-4 font-semibold text-muted">
          This combination isn&apos;t available
        </button>
      </div>
    );
  }

  const stock = variant.stock;
  const inCart = hydrated ? inCartLine : 0;
  const inCartAll = hydrated ? inCartVariant : 0;
  const outOfStock = stock !== null && stock <= 0;

  // How many more can be added on top of what's already in the cart:
  // the per-line cap, and the variant's stock across all its lines.
  const lineRoom = MAX_QTY_PER_ITEM - inCart;
  const stockRoom = stock === null ? Infinity : itemLimit({ maxQuantity: stock }) - inCartAll;
  const remaining = Math.max(Math.min(lineRoom, stockRoom), 0);
  const selected = Math.min(quantity, Math.max(remaining, 1));

  const cartPayload = {
    variantId: variant.id,
    productId: product.id,
    title: product.name,
    variantTitle: variant.title,
    price: variant.price,
    image: variant.image,
    href: variant.href,
    maxQuantity: stock,
    customization: customization?.values,
    customizationDisplay: customization?.display.length ? customization.display : undefined,
  };

  const handleAdd = () => {
    if (remaining <= 0) return;
    if (customization && !customization.validate()) return;
    addItem(cartPayload, selected);
    setQuantity(1);
    setAdded(true);
  };

  const handleBuyNow = () => {
    if (customization && !customization.validate()) return;
    // Already in the cart: go straight to checkout without adding more.
    if (inCart === 0 && remaining > 0) addItem(cartPayload, selected);
    router.push("/checkout");
  };

  if (outOfStock) {
    return (
      <div className="mt-8 space-y-3">
        <p className="text-sm font-semibold text-red-600">Out of stock</p>
        <button disabled className="w-full cursor-not-allowed rounded-full bg-border py-4 font-semibold text-muted">
          Currently unavailable
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {stock !== null && stock <= LOW_STOCK_THRESHOLD && (
        <p className="mb-3 text-sm font-semibold text-amber-600">Only {stock} left in stock</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-semibold tracking-wide">QUANTITY</span>

        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={selected <= 1}
            className="rounded-full p-3 hover:bg-surface disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>

          <span className="w-10 text-center font-semibold" aria-live="polite">
            {selected}
          </span>

          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            disabled={selected >= remaining}
            className="rounded-full p-3 hover:bg-surface disabled:opacity-40"
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>

        {inCartAll > 0 && (
          <Link href="/cart" className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
            {inCartAll} in your cart
          </Link>
        )}
      </div>

      {remaining <= 0 && (
        <p className="mt-3 text-sm text-muted">You already have the maximum quantity in your cart.</p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleAdd}
          disabled={remaining <= 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-foreground py-4 font-semibold transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
        >
          {added ? <Check size={18} /> : <ShoppingBag size={18} />}
          {added ? "Added to cart" : "Add to cart"}
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#003D29] py-4 font-semibold text-white transition hover:bg-[#002B1D]"
        >
          <Zap size={18} />
          Buy now
        </button>
      </div>
    </div>
  );
}
