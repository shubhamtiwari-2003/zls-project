// Shop-wide rules shared by the client (display) and server (pricing).
// Amounts are whole rupees, matching products.price.
//
// The store rules (shipping, quantity limits, stock warnings, payment
// timing) are edited in Admin → Settings and stored in the shop_settings
// table. Read them with getShopSettings() on the server and
// useShopSettings() in client components. The defaults below are used only
// if the table can't be read.

export const CURRENCY = "INR";

// Technical safety cap on lines per cart request (not a shop rule).
export const MAX_CART_LINES = 50;

// Highest per-item quantity an admin can allow (matches the DB checks).
export const MAX_QTY_LIMIT = 50;

export interface ShopSettings {
  freeShippingThreshold: number;
  shippingFee: number;
  maxQtyPerItem: number;
  // Stock at or below this shows as "Low stock" / "Only N left".
  lowStockThreshold: number;
  // Unpaid orders hold their stock this long, then expire and release it.
  orderReservationMinutes: number;
  // Razorpay popup closes itself after this (kept below the reservation).
  paymentWindowMinutes: number;
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  freeShippingThreshold: 999,
  shippingFee: 99,
  maxQtyPerItem: 10,
  lowStockThreshold: 5,
  orderReservationMinutes: 30,
  paymentWindowMinutes: 15,
};

// shop_settings row
export interface ShopSettingsRow {
  free_shipping_threshold: number;
  shipping_fee: number;
  max_qty_per_item: number;
  low_stock_threshold: number;
  order_reservation_minutes: number;
  payment_window_minutes: number;
}

export const SHOP_SETTINGS_SELECT =
  "free_shipping_threshold, shipping_fee, max_qty_per_item, low_stock_threshold, order_reservation_minutes, payment_window_minutes";

export function toShopSettings(row: ShopSettingsRow | null | undefined): ShopSettings {
  if (!row) return DEFAULT_SHOP_SETTINGS;

  return {
    freeShippingThreshold: Number(row.free_shipping_threshold),
    shippingFee: Number(row.shipping_fee),
    maxQtyPerItem: Number(row.max_qty_per_item),
    lowStockThreshold: Number(row.low_stock_threshold),
    orderReservationMinutes: Number(row.order_reservation_minutes),
    paymentWindowMinutes: Number(row.payment_window_minutes),
  };
}

export function shippingFor(subtotal: number, settings: ShopSettings): number {
  if (subtotal === 0 || subtotal >= settings.freeShippingThreshold) return 0;
  return settings.shippingFee;
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
