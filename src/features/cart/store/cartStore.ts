import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MAX_QTY_PER_ITEM } from "@/lib/shop-config";
import {
  cartLineKey,
  type CustomizationDisplay,
  type CustomizationValues,
} from "@/lib/customization";
import type { QuoteLine } from "@/types/cart";

/*
  The cart lives in localStorage for a fast UI. For signed-in users it is
  also mirrored to the cart_items table (see sync/cartSync.ts), so it
  follows them across devices.

  Each line is one VARIANT plus its CUSTOMIZATION (e.g. "Name keychain —
  Red, name ANNA"). Two keychains with different names are two lines;
  `lineKey` identifies a line (just the variant ID when not customised).

  price/title/image/maxQuantity here are for DISPLAY ONLY. The server
  re-prices and re-checks stock for every cart (/api/cart/quote,
  /api/checkout), and only receives variant IDs, quantities and
  customization values — so editing localStorage cannot change what the
  customer pays or buys.
*/

export interface CartItem {
  lineKey: string;
  variantId: string;
  productId: string;
  title: string;
  // "Batman · A3"; empty for products without options.
  variantTitle: string;
  // Per unit, including customization add-ons.
  price: number;
  image: string;
  href?: string | null;
  quantity: number;
  // Units in stock when last seen (product page or server quote).
  // null/undefined = unknown or unlimited.
  maxQuantity?: number | null;
  // fieldKey → text, or photo upload ID. Sent to the server.
  customization?: CustomizationValues;
  // What to show under the item ("Name: ANNA", photo thumbnail).
  customizationDisplay?: CustomizationDisplay[];
}

export type NewCartItem = Omit<CartItem, "quantity" | "lineKey">;

interface CartStore {
  items: CartItem[];

  // The signed-in user this cart mirrors (null = guest cart).
  // Lets cart sync tell a guest cart (merge it) from one already synced.
  syncedUserId: string | null;

  // Used by cart sync: replace the cart with the server's version.
  replaceItems: (items: CartItem[], userId: string) => void;
  // Used on sign-out: clear this device (the cart stays on the account).
  resetCart: () => void;

  addItem: (item: NewCartItem, quantity?: number) => void;
  increase: (lineKey: string) => void;
  decrease: (lineKey: string) => void;
  remove: (lineKey: string) => void;
  clearCart: () => void;

  // Refresh display data with server prices and stock.
  applyQuote: (lines: QuoteLine[]) => void;

  subtotal: () => number;
  totalItems: () => number;
}

/** Most of this item a customer can have: per-item cap and known stock. */
export function itemLimit(item: Pick<CartItem, "maxQuantity">): number {
  return Math.min(MAX_QTY_PER_ITEM, item.maxQuantity ?? MAX_QTY_PER_ITEM);
}

const clamp = (quantity: number, limit: number) => Math.min(Math.max(quantity, 1), limit);

const sameDisplay = (a?: CustomizationDisplay[], b?: CustomizationDisplay[]) =>
  JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      syncedUserId: null,

      replaceItems: (items, userId) => set({ items, syncedUserId: userId }),

      resetCart: () => set({ items: [], syncedUserId: null }),

      addItem: (item, quantity = 1) =>
        set((state) => {
          const lineKey = cartLineKey(item.variantId, item.customization);
          const existing = state.items.find((i) => i.lineKey === lineKey);

          if (existing) {
            const merged = { ...existing, maxQuantity: item.maxQuantity ?? existing.maxQuantity };
            const limit = itemLimit(merged);

            return {
              items: state.items.map((i) =>
                i.lineKey === lineKey
                  ? { ...merged, quantity: clamp(i.quantity + quantity, limit) }
                  : i
              ),
            };
          }

          const limit = itemLimit(item);
          if (limit <= 0) return state; // out of stock

          return {
            items: [...state.items, { ...item, lineKey, quantity: clamp(quantity, limit) }],
          };
        }),

      increase: (lineKey) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.lineKey === lineKey
              ? { ...i, quantity: clamp(i.quantity + 1, Math.max(itemLimit(i), i.quantity)) }
              : i
          ),
        })),

      decrease: (lineKey) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.lineKey === lineKey ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0),
        })),

      remove: (lineKey) =>
        set((state) => ({
          items: state.items.filter((i) => i.lineKey !== lineKey),
        })),

      clearCart: () => set({ items: [] }),

      applyQuote: (lines) =>
        set((state) => {
          const byKey = new Map(lines.map((line) => [line.lineKey, line]));
          let changed = false;

          const items = state.items.map((item) => {
            const line = byKey.get(item.lineKey);
            if (!line) return item;

            const next: CartItem = {
              ...item,
              productId: line.productId,
              title: line.name,
              variantTitle: line.variantTitle,
              price: line.unitPrice,
              image: line.image ?? item.image,
              href: line.href,
              quantity: line.quantity,
              maxQuantity: line.available,
              customizationDisplay: line.customization.length ? line.customization : undefined,
            };

            if (
              next.productId !== item.productId ||
              next.title !== item.title ||
              next.variantTitle !== item.variantTitle ||
              next.price !== item.price ||
              next.image !== item.image ||
              next.href !== item.href ||
              next.quantity !== item.quantity ||
              next.maxQuantity !== item.maxQuantity ||
              !sameDisplay(next.customizationDisplay, item.customizationDisplay)
            ) {
              changed = true;
              return next;
            }

            return item;
          });

          // Returning the same state skips a re-render (and a re-quote).
          return changed ? { items } : state;
        }),

      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "zlayer-cart", // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Persist data only.
      partialize: (state) => ({ items: state.items, syncedUserId: state.syncedUserId }),
      // v2: lines are variants. Older carts (per product) can't be mapped in
      // the browser, so they're dropped; signed-in users get theirs back
      // from the server (cart_items was migrated to variants).
      // v3: lines have a lineKey (variant + customization).
      version: 3,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as { items?: unknown; syncedUserId?: string | null };
        if (version < 2) return { items: [], syncedUserId: state.syncedUserId ?? null };

        const items = Array.isArray(state.items) ? (state.items as CartItem[]) : [];

        return {
          items: items.map((item) => ({ ...item, lineKey: item.lineKey ?? item.variantId })),
          syncedUserId: state.syncedUserId ?? null,
        };
      },
    }
  )
);
