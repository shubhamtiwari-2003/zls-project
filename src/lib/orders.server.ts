import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RazorpayPaymentEntity } from "@/lib/razorpay.server";

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
 * Saves how the customer paid (UPI, card…) and Razorpay's fee on the order.
 * Call before markOrderPaid(): the invoice issued at payment includes the
 * method. Never throws — these details are nice to have, not required.
 */
export async function recordPaymentDetails(
  admin: SupabaseClient,
  razorpayOrderId: string,
  payment: RazorpayPaymentEntity
): Promise<void> {
  const details = {
    bank: payment.bank ?? null,
    wallet: payment.wallet ?? null,
    vpa: payment.vpa ?? null,
    card_network: payment.card?.network ?? null,
    card_last4: payment.card?.last4 ?? null,
  };

  const { error } = await admin
    .from("orders")
    .update({
      payment_method: payment.method ?? null,
      payment_details: details,
      payment_fee: payment.fee ?? null,
      payment_tax: payment.tax ?? null,
    })
    .eq("razorpay_order_id", razorpayOrderId);

  if (error) console.error("Record payment details error:", error);
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

/**
 * Cancels unpaid orders older than the reservation window (Admin →
 * Settings). Returns the count.
 */
export async function expireStaleOrders(admin: SupabaseClient, reservationMinutes: number): Promise<number> {
  const { data, error } = await admin.rpc("expire_stale_orders", {
    p_minutes: reservationMinutes,
  });

  if (error) throw new Error(error.message);

  return Number(data ?? 0);
}
