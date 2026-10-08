/*
  Promotions (Admin → Promotions): campaigns for events and what they show.
  Shared by the admin tab and the storefront. Database: promo_campaigns,
  promotions (supabase/migrations/20261001140000_promotions.sql).
*/

export type Placement = "hero_banner" | "announcement_bar" | "popup" | "product_notice";
export type PromoTone = "brand" | "dark" | "festive" | "sale" | "green";
export type NoticeTarget = "all" | "categories" | "products";

export interface PromoCampaign {
  id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export interface Promotion {
  id: string;
  campaign_id: string;
  placement: Placement;
  is_active: boolean;
  sort_order: number;
  tag: string | null;
  title: string | null;
  body: string | null;
  cta_label: string | null;
  link_url: string | null;
  image_url: string | null;
  image_public_id: string | null;
  mobile_image_url: string | null;
  mobile_image_public_id: string | null;
  tone: PromoTone;
  target: NoticeTarget;
  category_ids: string[];
  product_ids: string[];
}

export const CAMPAIGN_SELECT = "id, name, starts_at, ends_at, is_active, priority, created_at";
export const PROMOTION_SELECT =
  "id, campaign_id, placement, is_active, sort_order, tag, title, body, cta_label, link_url, image_url, image_public_id, mobile_image_url, mobile_image_public_id, tone, target, category_ids, product_ids";

export const PLACEMENTS: { value: Placement; label: string; description: string }[] = [
  { value: "hero_banner", label: "Homepage banners", description: "Slides in the homepage carousel." },
  { value: "announcement_bar", label: "Header announcements", description: "Messages in the bar above the header. Two or more scroll." },
  { value: "popup", label: "Popup", description: "Shown once to each visitor, a moment after the page opens." },
  { value: "product_notice", label: "Product page notices", description: "A note on product pages, for all or selected products." },
];

/**
 * Colour presets. Fixed colours (the same in light and dark mode) with white
 * text; each is at least 4.5:1 for readability. Tokens: --promo-* in
 * globals.css.
 */
export const TONES: { value: PromoTone; label: string; className: string }[] = [
  { value: "brand", label: "Brand blue", className: "bg-brand text-white" },
  { value: "dark", label: "Black", className: "bg-promo-dark text-white" },
  { value: "festive", label: "Festive orange", className: "bg-promo-festive text-white" },
  { value: "sale", label: "Sale red", className: "bg-promo-sale text-white" },
  { value: "green", label: "Green", className: "bg-promo-green text-white" },
];

export const toneClass = (tone: PromoTone) => TONES.find((item) => item.value === tone)?.className ?? TONES[0].className;

export type CampaignStatus = "live" | "scheduled" | "ended" | "off";

export function campaignStatus(campaign: Pick<PromoCampaign, "is_active" | "starts_at" | "ends_at">, now = Date.now()): CampaignStatus {
  if (!campaign.is_active) return "off";
  if (campaign.ends_at && now >= new Date(campaign.ends_at).getTime()) return "ended";
  if (campaign.starts_at && now < new Date(campaign.starts_at).getTime()) return "scheduled";
  return "live";
}

/** Opens in a new tab when it leaves the site. */
export const isExternalLink = (url: string) => /^https?:\/\//.test(url);

/** Live promotions for the storefront, grouped by placement. */
export interface LivePromotions {
  heroBanners: Promotion[];
  announcements: Promotion[];
  popup: Promotion | null;
  productNotices: Promotion[];
}

export const NO_PROMOTIONS: LivePromotions = { heroBanners: [], announcements: [], popup: null, productNotices: [] };

/** Notices for one product page. */
export function noticesFor(notices: Promotion[], product: { id: string; categoryId: string }): Promotion[] {
  return notices.filter(
    (notice) =>
      notice.target === "all" ||
      (notice.target === "categories" && notice.category_ids.includes(product.categoryId)) ||
      (notice.target === "products" && notice.product_ids.includes(product.id))
  );
}
