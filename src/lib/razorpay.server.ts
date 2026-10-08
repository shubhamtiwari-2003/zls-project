import "server-only";

import crypto from "crypto";

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured.");
  }

  return { keyId, keySecret };
}

// The key ID is public (it is given to Razorpay Checkout in the browser).
export function razorpayKeyId(): string {
  return credentials().keyId;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

/** Creates a Razorpay order. `amountPaise` is in the smallest unit (₹1 = 100). */
export async function createRazorpayOrder({
  amountPaise,
  receipt,
  notes,
}: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const { keyId, keySecret } = credentials();

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.description ?? "Razorpay order creation failed.");
  }

  return { id: data.id, amount: data.amount, currency: data.currency };
}

function hmacHex(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

/** Verifies the signature Razorpay Checkout returns after a successful payment. */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  const { keySecret } = credentials();
  return safeEqual(hmacHex(keySecret, `${razorpayOrderId}|${razorpayPaymentId}`), signature);
}

/** Verifies the X-Razorpay-Signature header of a webhook request. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured.");
  return safeEqual(hmacHex(secret, rawBody), signature);
}

// The parts of a Razorpay payment we keep (amounts in paise).
export interface RazorpayPaymentEntity {
  id: string;
  order_id?: string;
  amount?: number;
  method?: string;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  fee?: number | null;
  tax?: number | null;
  card?: { network?: string | null; last4?: string | null } | null;
}

/** Fetches a payment from Razorpay (method, fee…). */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPaymentEntity> {
  const { keyId, keySecret } = credentials();

  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.description ?? "Could not fetch the Razorpay payment.");
  }

  return data as RazorpayPaymentEntity;
}
