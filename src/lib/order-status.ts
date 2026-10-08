// Order status vocabulary shared by admin and storefront.
//
// Three independent dimensions on an order:
//   payment_status      unpaid → paid
//   status              pending → confirmed | canceled
//   fulfillment_status  unfulfilled → printing → out_for_shipping →
//                       in_transit → out_for_delivery → delivered
//
// Fulfillment is set by the admin today; a courier integration (e.g.
// Delhivery webhooks) can later move it through the same steps.

export const FULFILLMENT_STEPS = [
  { value: "printing", label: "Printing" },
  { value: "out_for_shipping", label: "Out for shipping" },
  { value: "in_transit", label: "In transit" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
] as const;

export type FulfillmentStatus = "unfulfilled" | (typeof FULFILLMENT_STEPS)[number]["value"];

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: "New order",
  printing: "Printing",
  out_for_shipping: "Out for shipping",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

// Statuses where a courier and tracking number make sense.
export const SHIPPING_STATUSES: FulfillmentStatus[] = ["out_for_shipping", "in_transit", "out_for_delivery", "delivered"];

export type StatusTone = "green" | "blue" | "amber" | "red" | "gray";

export const TONE_CLASSES: Record<StatusTone, string> = {
  green: "bg-success/10 text-success ",
  blue: "bg-info/10 text-info ",
  amber: "bg-warning/10 text-warning ",
  red: "bg-danger/10 text-danger",
  gray: "bg-zinc-500/10 text-muted-foreground",
};

export interface OrderStatusFields {
  status: string;
  payment_status: string;
  fulfillment_status?: string | null;
}

/** One label for an order, combining payment, cancellation and fulfillment. */
export function orderStatusBadge(order: OrderStatusFields): { label: string; tone: StatusTone } {
  if (order.status === "canceled") return { label: "Canceled", tone: "red" };
  if (order.payment_status !== "paid") return { label: "Payment pending", tone: "amber" };

  const fulfillment = (order.fulfillment_status ?? "unfulfilled") as FulfillmentStatus;

  if (fulfillment === "delivered") return { label: "Delivered", tone: "green" };
  if (fulfillment === "unfulfilled") return { label: "Confirmed", tone: "blue" };

  return { label: FULFILLMENT_LABELS[fulfillment] ?? fulfillment, tone: "blue" };
}

/** Index of the current step in FULFILLMENT_STEPS (-1 = not started). */
export function fulfillmentStepIndex(status: string | null | undefined): number {
  return FULFILLMENT_STEPS.findIndex((step) => step.value === status);
}
