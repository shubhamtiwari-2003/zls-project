import "server-only";

import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

/**
 * Store rules for server components and route handlers, read once per
 * request. Public data, so a cookie-less client is used: reading it doesn't
 * make a page dynamic.
 */
export const getShopSettings = cache(async (): Promise<ShopSettings> => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  return loadShopSettings(supabase);
});
