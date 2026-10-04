import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/razorpay.server";
import { markOrderPaid } from "@/lib/orders.server";

export const runtime = "nodejs";

/**
 * Razorpay webhook (Dashboard → Webhooks). Subscribe to:
 *   payment.captured, order.paid
 *
 * Records payments even when the customer closes the browser before
 * /api/checkout/verify runs.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }
  } catch (error) {
    console.error("Razorpay webhook config error:", error);
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "payment.captured" && event.event !== "order.paid") {
    // Acknowledge events we don't handle so Razorpay doesn't retry them.
    return NextResponse.json({ received: true });
  }

  const payment = event.payload?.payment?.entity;

  if (!payment?.order_id || !payment?.id) {
    return NextResponse.json({ received: true });
  }

  try {
    const result = await markOrderPaid(createAdminClient(), {
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      amountPaise: payment.amount,
    });

    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    // Non-2xx makes Razorpay retry later.
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
