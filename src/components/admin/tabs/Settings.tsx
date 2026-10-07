"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Clock, Info, Loader2, Save, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { parseWholeNumber } from "@/lib/number-input";
import {
  MAX_QTY_LIMIT,
  SHOP_SETTINGS_SELECT,
  formatINR,
  toShopSettings,
  type ShopSettings,
  type ShopSettingsRow,
} from "@/lib/shop-config";

type Field = keyof ShopSettings;

// What each field accepts (matches the database checks).
const LIMITS: Record<Field, { min: number; max: number }> = {
  freeShippingThreshold: { min: 0, max: 1_000_000 },
  shippingFee: { min: 0, max: 10_000 },
  maxQtyPerItem: { min: 1, max: MAX_QTY_LIMIT },
  lowStockThreshold: { min: 0, max: 1000 },
  orderReservationMinutes: { min: 10, max: 240 },
  paymentWindowMinutes: { min: 5, max: 120 },
};

const LABELS: Record<Field, string> = {
  freeShippingThreshold: "Free shipping from",
  shippingFee: "Shipping fee",
  maxQtyPerItem: "Max quantity per item",
  lowStockThreshold: "Low stock warning at",
  orderReservationMinutes: "Hold stock for unpaid orders",
  paymentWindowMinutes: "Payment window",
};

type Draft = Record<Field, string>;

const toDraft = (settings: ShopSettings): Draft =>
  Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, String(value)])) as Draft;

function validate(draft: Draft): { values: ShopSettings | null; errors: Partial<Record<Field, string>> } {
  const errors: Partial<Record<Field, string>> = {};
  const values = {} as ShopSettings;

  for (const field of Object.keys(LIMITS) as Field[]) {
    const value = parseWholeNumber(draft[field]);
    const { min, max } = LIMITS[field];

    if (value === null && min > 0) errors[field] = "Required.";
    else if ((value ?? 0) < min || (value ?? 0) > max) errors[field] = `Between ${min} and ${max.toLocaleString("en-IN")}.`;
    else values[field] = value ?? 0;
  }

  if (!errors.paymentWindowMinutes && !errors.orderReservationMinutes &&
      values.paymentWindowMinutes > values.orderReservationMinutes - 5) {
    errors.paymentWindowMinutes = "Must be at least 5 minutes shorter than the stock hold.";
  }

  return { values: Object.keys(errors).length ? null : values, errors };
}

/**
 * Store rules saved in the shop_settings table. The checkout server reads
 * them on every order, so changes apply to the next cart refresh.
 */
export default function Settings() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<Draft | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    supabase
      .from("shop_settings")
      .select(`${SHOP_SETTINGS_SELECT}, updated_at`)
      .eq("id", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          console.log("Load settings error:", error);
          setLoadError(
            error?.message ?? "Settings not found. Run the shop_settings migration in Supabase."
          );
          return;
        }

        const values = toDraft(toShopSettings(data as ShopSettingsRow));
        setDraft(values);
        setSaved(values);
        setUpdatedAt((data as { updated_at: string }).updated_at);
      });
  }, []);

  if (loadError) {
    return <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600">{loadError}</p>;
  }

  if (!draft || !saved) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading settings…
      </div>
    );
  }

  const { values, errors } = validate(draft);
  const dirty = (Object.keys(draft) as Field[]).some((field) => draft[field] !== saved[field]);

  const set = (field: Field, text: string) => {
    setDraft({ ...draft, [field]: text.replace(/\D/g, "").slice(0, 7) });
    setMessage(null);
  };

  const handleSave = async () => {
    setShowErrors(true);
    if (!values || saving) return;

    setSaving(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("shop_settings")
      .update({
        free_shipping_threshold: values.freeShippingThreshold,
        shipping_fee: values.shippingFee,
        max_qty_per_item: values.maxQtyPerItem,
        low_stock_threshold: values.lowStockThreshold,
        order_reservation_minutes: values.orderReservationMinutes,
        payment_window_minutes: values.paymentWindowMinutes,
      })
      .eq("id", true)
      .select("updated_at");

    setSaving(false);

    // RLS returns no rows (not an error) if this user isn't an admin.
    if (error || !data?.length) {
      console.log("Save settings error:", error);
      setMessage({ type: "error", text: error?.message ?? "Could not save. Are you signed in as an admin?" });
      return;
    }

    const next = toDraft(values);
    setDraft(next);
    setSaved(next);
    setUpdatedAt(data[0].updated_at);
    setShowErrors(false);
    setMessage({ type: "success", text: "Settings saved. The store uses them from now on." });

    // Reload server data so the rest of the site sees the new values.
    router.refresh();
  };

  const input = (field: Field, unit: { prefix?: string; suffix?: string }, hint: string) => {
    const error = showErrors && errors[field];

    return (
      <div>
        <label htmlFor={`setting-${field}`} className="mb-1.5 block text-sm font-medium">
          {LABELS[field]}
        </label>
        <div
          className={`flex items-center rounded-xl border bg-background px-4 focus-within:ring-2 focus-within:ring-foreground/10 ${
            error ? "border-red-500" : "border-border"
          }`}
        >
          {unit.prefix && <span className="mr-2 text-sm text-muted-foreground">{unit.prefix}</span>}
          <input
            id={`setting-${field}`}
            type="text"
            inputMode="numeric"
            value={draft[field]}
            onChange={(e) => set(field, e.target.value)}
            disabled={saving}
            className="w-full bg-transparent py-3 outline-none"
          />
          {unit.suffix && <span className="ml-2 shrink-0 text-sm text-muted-foreground">{unit.suffix}</span>}
        </div>
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  };

  const freeFrom = values?.freeShippingThreshold ?? parseWholeNumber(draft.freeShippingThreshold) ?? 0;
  const fee = values?.shippingFee ?? parseWholeNumber(draft.shippingFee) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Store rules used by the cart, checkout and policy pages.</p>
        {updatedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Last saved {new Date(updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
      </div>

      {/* Shipping */}
      <section className="rounded-3xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <Truck size={20} />
          <h2 className="text-xl font-semibold">Shipping</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {input("freeShippingThreshold", { prefix: "₹" }, "Orders at or above this ship free. 0 = always free.")}
          {input("shippingFee", { prefix: "₹" }, "Charged on orders below the free-shipping amount.")}
        </div>
        <p className="mt-4 rounded-xl bg-background px-4 py-3 text-sm text-muted-foreground">
          Customers see:{" "}
          <span className="font-medium text-foreground">
            {freeFrom === 0 || fee === 0
              ? "Free shipping on every order"
              : `${formatINR(fee)} shipping, free on orders of ${formatINR(freeFrom)} or more`}
          </span>
        </p>
      </section>

      {/* Cart & stock */}
      <section className="rounded-3xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <Boxes size={20} />
          <h2 className="text-xl font-semibold">Cart &amp; stock</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {input("maxQtyPerItem", { suffix: "per item" }, `How many of one item a customer can buy at once (1–${MAX_QTY_LIMIT}).`)}
          {input("lowStockThreshold", { suffix: "units or fewer" }, "Shows “Only N left” to customers and flags items in Inventory.")}
        </div>
      </section>

      {/* Payment timing */}
      <section className="rounded-3xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <Clock size={20} />
          <h2 className="text-xl font-semibold">Payment timing</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {input("paymentWindowMinutes", { suffix: "minutes" }, "How long the Razorpay payment window stays open.")}
          {input("orderReservationMinutes", { suffix: "minutes" }, "Items in an unpaid order are held this long, then released.")}
        </div>
      </section>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0" />
        Shipping and payment timings also appear in the Shipping and Payment policies, which update automatically.
        Business name, address and contact details are set in <code>src/lib/business.ts</code>.
      </p>

      {/* Save */}
      <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-border bg-background/90 p-3 backdrop-blur">
        {message && (
          <p className={`mr-auto text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {message.text}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setDraft(saved);
            setShowErrors(false);
            setMessage(null);
          }}
          disabled={!dirty || saving}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-40"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save changes
        </button>
      </div>
    </div>
  );
}
