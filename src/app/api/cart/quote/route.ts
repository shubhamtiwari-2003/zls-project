import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCartItems, priceCart } from "@/lib/pricing.server";

/**
 * Prices the cart from the database so the cart/checkout pages always show
 * real prices, not the ones cached in localStorage.
 *
 * Body: { items: [{ key, variantId, quantity, customization? }] }
 */
export async function POST(request: Request) {
  let body: { items?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const items = parseCartItems(body?.items);

  if (!items) {
    return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { quote } = await priceCart(supabase, items);

    return NextResponse.json({ quote });
  } catch (error) {
    console.error("Cart quote error:", error);

    return NextResponse.json({ error: "Could not price your cart." }, { status: 500 });
  }
}
