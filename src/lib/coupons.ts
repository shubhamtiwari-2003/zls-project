// Coupon rules shared by the server (the discount actually charged) and the
// admin (previews). See supabase/migrations/20261001110000_coupons.sql.

import { formatINR } from "@/lib/shop-config";

export type CouponType = "percent" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponType;
  // percent: 1–100; fixed: rupees.
  discount_value: number;
  // Cap for percent coupons (rupees); null = no cap.
  max_discount: number | null;
  min_order_amount: number;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  is_active: boolean;
}

export const COUPON_SELECT =
  "id, code, description, discount_type, discount_value, max_discount, min_order_amount, starts_at, expires_at, usage_limit, per_user_limit, is_active";

export const COUPON_CODE_RE = /^[A-Z0-9_-]{3,30}$/;

/** What customers type → how codes are stored ("save 10" → "SAVE10"). */
export const normalizeCouponCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

/**
 * Rupees off a products subtotal. Never more than the subtotal, and the
 * order total (after shipping) stays at least ₹1 for Razorpay.
 */
export function couponDiscount(coupon: Pick<Coupon, "discount_type" | "discount_value" | "max_discount">, subtotal: number, shipping: number): number {
  if (subtotal <= 0) return 0;

  let discount =
    coupon.discount_type === "percent"
      ? Math.floor((subtotal * coupon.discount_value) / 100)
      : coupon.discount_value;

  if (coupon.discount_type === "percent" && coupon.max_discount) {
    discount = Math.min(discount, coupon.max_discount);
  }

  return Math.max(0, Math.min(discount, subtotal, subtotal + shipping - 1));
}

/** "10% off (up to ₹200) on orders of ₹499+" */
export function describeCoupon(coupon: Pick<Coupon, "discount_type" | "discount_value" | "max_discount" | "min_order_amount">): string {
  const off =
    coupon.discount_type === "percent"
      ? `${coupon.discount_value}% off${coupon.max_discount ? ` (up to ${formatINR(coupon.max_discount)})` : ""}`
      : `${formatINR(coupon.discount_value)} off`;

  return coupon.min_order_amount > 0 ? `${off} on orders of ${formatINR(coupon.min_order_amount)}+` : off;
}

// What the cart quote reports about the code the customer entered.
export interface AppliedCoupon {
  code: string;
  description: string;
  discount: number;
}
