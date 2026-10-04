import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ORDER_RESERVATION_MINUTES } from "@/lib/shop-config";

export type MarkPaidResult = "paid" | "already_paid" | "not_found" | "amount_mismatch";

/**
 * Marks an order as paid and turns its stock reservation into a deduction,
 * in one DB transaction (mark_order_paid). Safe to call more than once —
 * browser verify and webhook may both arrive; only the first one counts.
 *
 * `admin` must be the service-role client.
 */
export async function markOrderPaid(
  admin: SupabaseClient,
  {
    razorpayOrderId,
    razorpayPaymentId,
    amountPaise,
  }: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    // When known (webhook), must equal the order total.
    amountPaise?: number;
  }
): Promise<MarkPaidResult> {
  const { data, error } = await admin.rpc("mark_order_paid", {
    p_razorpay_order_id: razorpayOrderId,
    p_razorpay_payment_id: razorpayPaymentId,
    p_amount_paise: amountPaise ?? null,
  });

  if (error) throw new Error(error.message);

  const result = data as MarkPaidResult;

  if (result === "amount_mismatch") {
    console.error("Razorpay amount mismatch:", { razorpayOrderId, amountPaise });
  }

  return result;
}

/**
 * Cancels an unpaid order and releases its reserved stock.
 * With `userId`, only cancels if the order belongs to that user.
 * Returns false if the order was already paid/canceled.
 */
export async function cancelOrder(
  admin: SupabaseClient,
  orderId: string,
  userId?: string
): Promise<boolean> {
  const { data, error } = await admin.rpc("cancel_order", {
    p_order_id: orderId,
    p_user_id: userId ?? null,
  });

  if (error) throw new Error(error.message);

  return data === true;
}

/** Cancels unpaid orders older than the reservation window. Returns the count. */
export async function expireStaleOrders(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin.rpc("expire_stale_orders", {
    p_minutes: ORDER_RESERVATION_MINUTES,
  });

  if (error) throw new Error(error.message);

  return Number(data ?? 0);
}
