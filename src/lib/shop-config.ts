// Shop-wide rules shared by the client (display) and server (pricing).
// Amounts are whole rupees, matching products.price.

export const CURRENCY = "INR";

export const FREE_SHIPPING_THRESHOLD = 999;
export const SHIPPING_FEE = 99;

export const MAX_QTY_PER_ITEM = 10;

// Stock at or below this shows as "Low stock" / "Only N left".
export const LOW_STOCK_THRESHOLD = 5;

// Unpaid orders hold their stock this long, then expire and release it.
export const ORDER_RESERVATION_MINUTES = 30;

// Razorpay popup closes itself after this (kept below the reservation).
export const PAYMENT_WINDOW_SECONDS = 15 * 60;
export const MAX_CART_LINES = 50;

export function shippingFor(subtotal: number): number {
  if (subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_FEE;
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
