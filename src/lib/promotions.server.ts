import "server-only";

import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { storefrontCache } from "@/lib/storefront-cache";
import { NO_PROMOTIONS, PROMOTION_SELECT, type LivePromotions, type Promotion } from "@/lib/promotions";

type Row = Promotion & { promo_campaigns: { priority: number } | { priority: number }[] | null };

/**
 * Live promotions, read once per request. RLS returns only live items
 * (item and campaign on, inside the campaign's dates), so no date filtering
 * is needed here. Public data: a cookie-less client.
 *
 * Order: higher campaign priority first, then the item's position.
 * Falls back to nothing (the site shows its defaults) if the table is
 * missing or the read fails.
 */
async function loadLivePromotions(): Promise<LivePromotions> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("promotions")
    .select(`${PROMOTION_SELECT}, promo_campaigns!inner ( priority )`)
    .order("sort_order", { ascending: true });

  if (error) {
    // Before the promotions migration runs, the table doesn't exist.
    if (error.message.includes("promotions")) return NO_PROMOTIONS;
    throw new Error(`Promotions: ${error.message}`);
  }

  const priority = (row: Row) => {
    const campaign = Array.isArray(row.promo_campaigns) ? row.promo_campaigns[0] : row.promo_campaigns;
    return campaign?.priority ?? 0;
  };

  // Stable sort: keeps sort_order within the same priority.
  const rows = ((data ?? []) as Row[]).sort((a, b) => priority(b) - priority(a));
  const items: Promotion[] = rows.map((row) => {
    const item: Partial<Row> = { ...row };
    delete item.promo_campaigns;
    return item as Promotion;
  });
  const of = (placement: Promotion["placement"]) => items.filter((item) => item.placement === placement);

  return {
    heroBanners: of("hero_banner"),
    announcements: of("announcement_bar"),
    popup: of("popup")[0] ?? null,
    productNotices: of("product_notice"),
  };
}

/** Cached (see storefront-cache.ts): a campaign appears or ends within a minute of its time. */
export const getLivePromotions = cache(storefrontCache("promotions", loadLivePromotions, () => NO_PROMOTIONS));
