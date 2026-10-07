import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyCoupon, parseCartItems, priceCart } from "@/lib/pricing.server";
import { getShopSettings } from "@/lib/shop-settings.server";

/**
 * Prices the cart from the database so the cart/checkout pages always show
 * real prices, not the ones cached in localStorage.
 *
 * Body: { items: [{ key, variantId, quantity, customization? }], couponCode? }
 */
export async function POST(request: Request) {
  let body: { items?: unknown; couponCode?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const settings = await getShopSettings();
  const items = parseCartItems(body?.items, settings.maxQtyPerItem);

  if (!items) {
    return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const priced = await priceCart(supabase, items, settings);
    const couponCode = typeof body.couponCode === "string" ? body.couponCode.slice(0, 40) : null;
    const { quote } = await applyCoupon(priced.quote, couponCode, user?.id ?? null);

    return NextResponse.json({ quote });
  } catch (error) {
    console.error("Cart quote error:", error);

    return NextResponse.json({ error: "Could not price your cart." }, { status: 500 });
  }
}
