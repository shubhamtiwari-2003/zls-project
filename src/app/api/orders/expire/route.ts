import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { expireStaleOrders } from "@/lib/orders.server";

export const dynamic = "force-dynamic";

/**
 * Cancels unpaid orders older than ORDER_RESERVATION_MINUTES and releases
 * their reserved stock. Checkout also does this on every order, so this
 * cron is a backup for quiet periods.
 *
 * Auth:     Authorization: Bearer <CRON_SECRET>
 * Schedule: e.g. every 15 minutes.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const expired = await expireStaleOrders(createAdminClient());

    return NextResponse.json({ success: true, expired });
  } catch (error) {
    console.error("Expire orders error:", error);

    return NextResponse.json({ success: false, error: "Could not expire orders." }, { status: 500 });
  }
}
