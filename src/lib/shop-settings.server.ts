import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/public";
import { storefrontCache } from "@/lib/storefront-cache";
import {
  DEFAULT_SHOP_SETTINGS,
  SHOP_SETTINGS_SELECT,
  toShopSettings,
  type ShopSettings,
  type ShopSettingsRow,
} from "@/lib/shop-config";

/** Reads the store rules with any Supabase client. Falls back to defaults. */
export async function loadShopSettings(supabase: SupabaseClient): Promise<ShopSettings> {
  const { data, error } = await supabase
    .from("shop_settings")
    .select(SHOP_SETTINGS_SELECT)
    .eq("id", true)
    .maybeSingle();

  if (error) {
    console.error("Shop settings error:", error);
    return DEFAULT_SHOP_SETTINGS;
  }

  return toShopSettings(data as ShopSettingsRow | null);
}

/** Store rules, failing loudly (so a failed read is never cached). */
async function loadShopSettingsOrThrow(): Promise<ShopSettings> {
  const { data, error } = await createPublicClient()
    .from("shop_settings")
    .select(SHOP_SETTINGS_SELECT)
    .eq("id", true)
    .maybeSingle();

  if (error) throw new Error(`Shop settings: ${error.message}`);
  return toShopSettings(data as ShopSettingsRow | null);
}

/**
 * Store rules for pages (cached, see storefront-cache.ts; cleared when
 * Admin → Settings is saved). Falls back to the defaults.
 */
export const getShopSettings = cache(storefrontCache("shop-settings", loadShopSettingsOrThrow, () => DEFAULT_SHOP_SETTINGS));

/**
 * Store rules read live, for checkout and pricing: shipping fees and limits
 * must be exactly what's saved at the moment of the order.
 */
export const getFreshShopSettings = cache(async (): Promise<ShopSettings> => loadShopSettings(createPublicClient()));
