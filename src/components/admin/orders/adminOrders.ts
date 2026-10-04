// Admin order data: one query + mapping shared by the Orders tab and the
// Overview's Recent Orders. Reads rely on the admin RLS policies on
// orders, order_items and addresses.

import type { CustomizationSnapshotEntry } from "@/lib/customization";

export const ADMIN_ORDER_SELECT = `
  id, order_number, status, payment_status, fulfillment_status,
  subtotal_amount, shipping_amount, total_amount,
  placed_at, paid_at, canceled_at, fulfilled_at,
  courier, tracking_number, tracking_url, razorpay_payment_id,
  shipping_address:addresses!shipping_address_id (
    full_name, phone, line1, line2, city, state, postal_code
  ),
  order_items ( id, product_name, variant_title, image_url, sku, quantity, unit_price, total_price, customization )
`;

export interface AdminOrderItem {
  id: string;
  product_name: string | null;
  variant_title: string | null;
  image_url: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  // What the customer personalised (null = regular item).
  customization: CustomizationSnapshotEntry[] | null;
}

export interface AdminOrderAddress {
  full_name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  subtotal_amount: number;
  shipping_amount: number;
  total_amount: number;
  placed_at: string;
  paid_at: string | null;
  canceled_at: string | null;
  fulfilled_at: string | null;
  courier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  razorpay_payment_id: string | null;
  shipping_address: AdminOrderAddress | null;
  order_items: AdminOrderItem[];
}

/** Normalizes a row from ADMIN_ORDER_SELECT (one-to-one joins may come as arrays). */
export function toAdminOrder(row: unknown): AdminOrder {
  const order = row as AdminOrder & { shipping_address: AdminOrderAddress | AdminOrderAddress[] | null };
  const address = Array.isArray(order.shipping_address) ? order.shipping_address[0] : order.shipping_address;

  return {
    ...order,
    fulfillment_status: order.fulfillment_status ?? "unfulfilled",
    shipping_address: address ?? null,
    order_items: order.order_items ?? [],
  };
}

export const formatOrderDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const itemCount = (order: AdminOrder) =>
  order.order_items.reduce((sum, item) => sum + item.quantity, 0);
