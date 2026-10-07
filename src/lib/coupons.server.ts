import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatINR } from "@/lib/shop-config";
import {
  COUPON_CODE_RE,
  COUPON_SELECT,
  couponDiscount,
  describeCoupon,
  normalizeCouponCode,
  type Coupon,
} from "@/lib/coupons";

export type CouponCheck =
  | { ok: true; coupon: Coupon; discount: number; description: string }
  | { ok: false; code: string; error: string };

const fail = (code: string, error: string): CouponCheck => ({ ok: false, code, error });

/**
 * Checks a code the customer entered against the cart. Coupons aren't
 * readable by customers, so this uses the service role. The same limits are
 * checked again inside create_order(), with the coupon row locked.
 *
 * userId: per-customer limits are checked only when signed in (checkout
 * always is).
 */
export async function checkCoupon(
  rawCode: string,
  { userId, subtotal, shipping }: { userId: string | null; subtotal: number; shipping: number }
): Promise<CouponCheck> {
  const code = normalizeCouponCode(rawCode);

  if (!COUPON_CODE_RE.test(code)) return fail(code, "This coupon code isn't valid.");

  const admin = createAdminClient();

  const { data, error } = await admin.from("coupons").select(COUPON_SELECT).eq("code", code).maybeSingle();

  if (error) {
    console.error("Coupon lookup error:", error);
    return fail(code, "Couldn't check this coupon. Please try again.");
  }

  const coupon = data as Coupon | null;
  const now = Date.now();

  if (!coupon || !coupon.is_active) return fail(code, "This coupon code isn't valid.");
  if (coupon.starts_at && now < new Date(coupon.starts_at).getTime()) {
    return fail(code, "This coupon isn't active yet.");
  }
  if (coupon.expires_at && now >= new Date(coupon.expires_at).getTime()) {
    return fail(code, "This coupon has expired.");
  }
  if (subtotal < coupon.min_order_amount) {
    return fail(
      code,
      `Add ${formatINR(coupon.min_order_amount - subtotal)} more to use this coupon (minimum order ${formatINR(coupon.min_order_amount)}).`
    );
  }

  if (coupon.usage_limit) {
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .neq("status", "canceled");

    if ((count ?? 0) >= coupon.usage_limit) return fail(code, "This coupon has been fully redeemed.");
  }

  if (coupon.per_user_limit && userId) {
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("user_id", userId)
      .neq("status", "canceled");

    if ((count ?? 0) >= coupon.per_user_limit) {
      return fail(code, "You've already used this coupon.");
    }
  }

  const discount = couponDiscount(coupon, subtotal, shipping);
  if (discount <= 0) return fail(code, "This coupon doesn't apply to your cart.");

  return { ok: true, coupon, discount, description: coupon.description || describeCoupon(coupon) };
}
