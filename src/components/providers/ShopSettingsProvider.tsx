"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { DEFAULT_SHOP_SETTINGS, type ShopSettings } from "@/lib/shop-config";
import { useCartStore } from "@/features/cart/store/cartStore";

const ShopSettingsContext = createContext<ShopSettings>(DEFAULT_SHOP_SETTINGS);

/**
 * Store rules (from Admin → Settings) for client components. Loaded on the
 * server in the root layout; refreshed when an admin saves (router.refresh).
 */
export function ShopSettingsProvider({ settings, children }: { settings: ShopSettings; children: ReactNode }) {
  // The cart store lives outside React; give it the per-item limit.
  useEffect(() => {
    useCartStore.getState().setMaxPerItem(settings.maxQtyPerItem);
  }, [settings.maxQtyPerItem]);

  return <ShopSettingsContext.Provider value={settings}>{children}</ShopSettingsContext.Provider>;
}

export const useShopSettings = () => useContext(ShopSettingsContext);
