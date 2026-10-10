"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, AlertTriangle, Pencil, Plus } from "lucide-react";
import { useCartStore } from "@/features/cart/store/cartStore";
import { useCartQuote } from "@/features/cart/hooks/useCartQuote";
import { CartSummary } from "@/features/cart/components/CartSummary";
import { CouponBox } from "@/features/cart/components/CouponBox";
import { CartItemCustomization } from "@/features/cart/components/CartItemCustomization";
import { formatINR } from "@/lib/shop-config";
import { useShopSettings } from "@/components/providers/ShopSettingsProvider";
import {
  EMPTY_ADDRESS,
  formatAddressLine,
  normalizeAddress,
  validateAddress,
  type AddressErrors,
  type SavedAddress,
  type ShippingAddress,
} from "@/lib/checkout-validation";
import { loadRazorpay } from "@/features/checkout/lib/loadRazorpay";
import { AddressFields } from "@/features/checkout/components/AddressFields";

interface CheckoutFormProps {
  email: string;
  defaultName: string;
  savedAddresses: SavedAddress[];
}

/*
  saved → ship to a saved address as-is
  new   → type a new address
  edit  → change a saved address; saved as a NEW address, the old one is
          hidden from this list (past orders keep it)
*/
type AddressMode =
  | { kind: "saved"; id: string }
  | { kind: "new" }
  | { kind: "edit"; id: string };

export function CheckoutForm({ email, defaultName, savedAddresses }: CheckoutFormProps) {
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);
  const couponCode = useCartStore((state) => state.couponCode);
  const rejectCoupon = useCartStore((state) => state.rejectCoupon);
  const { paymentWindowMinutes } = useShopSettings();
  const { hydrated, items, quote, error: quoteError, loading } = useCartQuote();

  // Most recently used saved address is pre-selected.
  const [mode, setMode] = useState<AddressMode>(
    savedAddresses.length ? { kind: "saved", id: savedAddresses[0].id } : { kind: "new" }
  );

  const [address, setAddress] = useState<ShippingAddress>({
    ...EMPTY_ADDRESS,
    full_name: defaultName,
  });

  const selectSaved = (id: string) => {
    setMode({ kind: "saved", id });
    setFieldErrors({});
  };

  const startNew = () => {
    setMode({ kind: "new" });
    setAddress({ ...EMPTY_ADDRESS, full_name: defaultName });
    setFieldErrors({});
  };

  const startEdit = (saved: SavedAddress) => {
    const { id, ...fields } = saved;
    setMode({ kind: "edit", id });
    setAddress(fields);
    setFieldErrors({});
  };
  const [fieldErrors, setFieldErrors] = useState<AddressErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasUnavailable =
    (quote?.unavailable.length ?? 0) + (quote?.outOfStock.length ?? 0) + (quote?.invalid.length ?? 0) > 0;
  const canPay = !!quote && !loading && !quoteError && !hasUnavailable && quote.lines.length > 0;

  const updateField = (key: keyof ShippingAddress, value: string) => {
    setAddress((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPay || submitting) return;

    setMessage(null);

    let addressPayload: Record<string, unknown>;

    if (mode.kind === "saved") {
      addressPayload = { addressId: mode.id };
    } else {
      const normalized = normalizeAddress(address);
      const errors = validateAddress(normalized);

      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        return;
      }

      addressPayload = {
        address: normalized,
        replacesAddressId: mode.kind === "edit" ? mode.id : undefined,
      };
    }

    setSubmitting(true);

    try {
      // 1. Create the order — the server computes every amount.
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            key: item.lineKey,
            variantId: item.variantId,
            quantity: item.quantity,
            customization: item.customization ?? {},
          })),
          couponCode,
          ...addressPayload,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/sign-in?next=/checkout");
        return;
      }

      if (!response.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);

        // Coupon became unusable: drop it so the totals update, and say why.
        if (data.couponError || data.quote?.couponError) {
          rejectCoupon(data.quote?.couponError ?? data.error);
        }
        throw new Error(data.error ?? "Could not place your order.");
      }

      // 2. Open Razorpay for the server-created order.
      const loaded = await loadRazorpay();

      if (!loaded || !window.Razorpay) {
        throw new Error("Could not load the payment window. Check your connection and try again.");
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpayOrderId,
        name: "Z Factor Studio",
        description: `Order ${data.orderNumber}`,
        prefill: data.prefill,
        theme: { color: "#0440af" },
        timeout: paymentWindowMinutes * 60,

        handler: async (payment) => {
          // 3. Verify on the server, then show the order.
          //    Even if verify fails here, the webhook records the payment,
          //    and the order page shows the real status.
          try {
            await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderId, ...payment }),
            });
          } finally {
            clearCart();
            router.replace(`/orders/${data.orderId}`);
          }
        },

        modal: {
          ondismiss: () => {
            // Release the reserved stock now instead of waiting for expiry.
            // keepalive lets the request finish even if the tab is closing.
            fetch("/api/checkout/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderId }),
              keepalive: true,
            }).catch(() => {});

            setSubmitting(false);
            setMessage("Payment was cancelled. Your cart is still saved — you can try again.");
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
        setMessage(response.error?.description ?? "Payment failed. Please try again.");
      });

      razorpay.open();
    } catch (error) {
      setSubmitting(false);
      setMessage(error instanceof Error ? error.message : "Could not place your order.");
    }
  };

  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link href="/products" className="mt-6 rounded-full bg-foreground px-6 py-3 font-medium text-background">
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <form onSubmit={handleSubmit} noValidate className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1fr_400px] lg:gap-8 [&>*]:min-w-0">
        {/* LEFT: address */}
        <section className="rounded-3xl border border-border bg-surface p-6">
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {email}</p>

          <h2 className="mt-8 text-lg font-semibold">Shipping address</h2>

          {/* Saved addresses */}
          {savedAddresses.length > 0 && (
            <div className="mt-4 space-y-3" role="radiogroup" aria-label="Saved addresses">
              {savedAddresses.map((saved) => {
                const selected = mode.kind === "saved" && mode.id === saved.id;
                const editing = mode.kind === "edit" && mode.id === saved.id;

                return (
                  <div
                    key={saved.id}
                    className={`flex items-start gap-3 rounded-2xl border p-4 transition ${
                      selected || editing ? "border-brand ring-2 ring-brand/15" : "border-border"
                    }`}
                  >
                    <label className="flex flex-1 cursor-pointer items-start gap-3">
                      <input
                        type="radio"
                        name="saved-address"
                        checked={selected}
                        onChange={() => selectSaved(saved.id)}
                        disabled={submitting}
                        className="mt-1 accent-brand"
                      />
                      <span className="text-sm">
                        <span className="font-semibold">{saved.full_name}</span>
                        <span className="text-muted-foreground"> · {saved.phone}</span>
                        <span className="mt-1 block text-muted-foreground">{formatAddressLine(saved)}</span>
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => startEdit(saved)}
                      disabled={submitting}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={startNew}
                disabled={submitting}
                className={`flex w-full items-center gap-2 rounded-2xl border border-dashed p-4 text-sm font-medium transition hover:border-foreground ${
                  mode.kind === "new" ? "border-brand text-foreground" : "border-border text-muted-foreground"
                }`}
              >
                <Plus size={16} />
                Add a new address
              </button>
            </div>
          )}

          {mode.kind === "edit" && (
            <p className="mt-4 rounded-xl bg-warning/10 px-4 py-3 text-xs text-warning ">
              Your changes will be saved as a new address. Past orders keep the address they were shipped to.
            </p>
          )}

          {/* Address form (new or edit) */}
          {mode.kind !== "saved" && (
            <div className="mt-4">
              <AddressFields
                address={address}
                errors={fieldErrors}
                onChange={updateField}
                disabled={submitting}
              />
            </div>
          )}
        </section>

        {/* RIGHT: summary */}
        <aside className="h-fit rounded-3xl border border-border bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="text-xl font-bold">Order Summary</h2>

          <ul className="my-6 space-y-4">
            {items.map((item) => (
              <li key={item.lineKey} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-background">
                  {item.image && <Image src={item.image} alt={item.title} fill sizes="56px" className="object-cover" />}
                  <span className="absolute right-0.5 top-0.5 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white">
                    {item.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  {item.title}
                  {item.variantTitle && <span className="block text-xs text-muted-foreground">{item.variantTitle}</span>}
                  <CartItemCustomization entries={item.customizationDisplay} className="mt-1" />
                </div>
                <span className="text-sm font-medium">{formatINR(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mb-6">
            <CouponBox quote={quote} loading={loading} disabled={submitting} />
          </div>

          <CartSummary quote={quote} loading={loading} />

          {hasUnavailable && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Some items are out of stock, no longer available or need new personalisation details.{" "}
                <Link href="/cart" className="font-semibold underline">
                  Update your cart
                </Link>
              </span>
            </div>
          )}

          {(message || quoteError) && (
            <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{message ?? quoteError}</p>
          )}

          <button
            type="submit"
            disabled={!canPay || submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {submitting ? "Processing..." : quote ? `Pay ${formatINR(quote.total)}` : "Pay"}
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By placing this order you agree to our{" "}
            <Link href="/terms-and-conditions" className="underline underline-offset-2 hover:text-foreground">
              Terms
            </Link>
            ,{" "}
            <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/cancellation-and-refund-policy" className="underline underline-offset-2 hover:text-foreground">
              Refund Policy
            </Link>
            .
          </p>

          <p className="mt-2 text-center text-xs text-muted-foreground">Secure payments powered by Razorpay</p>
        </aside>
      </form>
    </main>
  );
}
