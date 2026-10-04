import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentSignature } from "@/lib/razorpay.server";
import { markOrderPaid } from "@/lib/orders.server";

export const runtime = "nodejs";

/**
 * Called by the browser after Razorpay Checkout succeeds.
 * The signature proves the payment belongs to our Razorpay order.
 *
 * The webhook (/api/webhooks/razorpay) does the same job server-to-server,
 * so a payment is still recorded if the browser closes before this runs.
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
    const razorpayOrderId = body?.razorpay_order_id;
    const razorpayPaymentId = body?.razorpay_payment_id;
    const signature = body?.razorpay_signature;

    if (
      typeof orderId !== "string" ||
      typeof razorpayOrderId !== "string" ||
      typeof razorpayPaymentId !== "string" ||
      typeof signature !== "string"
    ) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const admin = createAdminClient();

    // The order must belong to this user and to this Razorpay order.
    const { data: order, error } = await admin
      .from("orders")
      .select("id, user_id, razorpay_order_id")
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!order || order.user_id !== user.id || order.razorpay_order_id !== razorpayOrderId) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature)) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const result = await markOrderPaid(admin, { razorpayOrderId, razorpayPaymentId });

    return NextResponse.json({ success: true, result, orderId: order.id });
  } catch (error) {
    console.error("Payment verify error:", error);

    return NextResponse.json({ error: "Could not verify the payment." }, { status: 500 });
  }
}
