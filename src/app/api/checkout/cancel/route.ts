import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelOrder } from "@/lib/orders.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Called when the customer closes the Razorpay popup without paying.
 * Cancels their unpaid order and releases its reserved stock right away,
 * instead of holding it until the order expires.
 *
 * If a payment still completes later (e.g. a slow UPI approval), the
 * webhook marks the order paid and deducts the stock then.
 *
 * Body: { orderId }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const orderId = body?.orderId;

    if (typeof orderId !== "string" || !UUID_RE.test(orderId)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    // Only cancels if it belongs to this user and is still unpaid.
    const canceled = await cancelOrder(createAdminClient(), orderId, user.id);

    return NextResponse.json({ canceled });
  } catch (error) {
    console.error("Cancel checkout error:", error);

    return NextResponse.json({ error: "Could not cancel the order." }, { status: 500 });
  }
}
