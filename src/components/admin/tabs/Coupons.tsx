"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Shuffle, TicketPercent, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatINR } from "@/lib/shop-config";
import {
  COUPON_CODE_RE,
  COUPON_SELECT,
  couponDiscount,
  describeCoupon,
  normalizeCouponCode,
  type Coupon,
  type CouponType,
} from "@/lib/coupons";

interface Usage {
  uses: number;
  paidUses: number;
}

// Form state: numbers kept as text while typing ("" = not set).
interface Draft {
  id?: string;
  code: string;
  description: string;
  discount_type: CouponType;
  discount_value: string;
  max_discount: string;
  min_order_amount: string;
  starts_at: string;
  expires_at: string;
  usage_limit: string;
  per_user_limit: string;
  is_active: boolean;
}

const EMPTY_DRAFT: Draft = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: "",
  max_discount: "",
  min_order_amount: "",
  starts_at: "",
  expires_at: "",
  usage_limit: "",
  per_user_limit: "1",
  is_active: true,
};

const digits = (text: string) => text.replace(/\D/g, "").slice(0, 7);
const num = (text: string) => (text ? Number(text) : null);

// ISO ↔ <input type="datetime-local"> (local time).
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const toDraft = (coupon: Coupon): Draft => ({
  id: coupon.id,
  code: coupon.code,
  description: coupon.description ?? "",
  discount_type: coupon.discount_type,
  discount_value: String(coupon.discount_value),
  max_discount: coupon.max_discount ? String(coupon.max_discount) : "",
  min_order_amount: coupon.min_order_amount ? String(coupon.min_order_amount) : "",
  starts_at: toLocalInput(coupon.starts_at),
  expires_at: toLocalInput(coupon.expires_at),
  usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : "",
  per_user_limit: coupon.per_user_limit ? String(coupon.per_user_limit) : "",
  is_active: coupon.is_active,
});

function validate(draft: Draft): string | null {
  const code = normalizeCouponCode(draft.code);
  const value = num(draft.discount_value);

  if (!COUPON_CODE_RE.test(code)) return "Code: 3–30 characters, letters, numbers, - or _ only.";
  if (!value || value <= 0) return "Enter the discount amount.";
  if (draft.discount_type === "percent" && value > 100) return "A percentage can't be more than 100.";
  if (draft.starts_at && draft.expires_at && new Date(draft.starts_at) >= new Date(draft.expires_at)) {
    return "The end date must be after the start date.";
  }
  if (draft.usage_limit && Number(draft.usage_limit) < 1) return "Total uses must be at least 1 (or empty).";
  if (draft.per_user_limit && Number(draft.per_user_limit) < 1) return "Uses per customer must be at least 1 (or empty).";
  return null;
}

type Status = { label: string; className: string };

function couponStatus(coupon: Coupon, usage: Usage | undefined): Status {
  const now = Date.now();
  if (!coupon.is_active) return { label: "Off", className: "bg-muted text-muted-foreground" };
  if (coupon.expires_at && now >= new Date(coupon.expires_at).getTime()) {
    return { label: "Expired", className: "bg-danger/10 text-danger" };
  }
  if (coupon.usage_limit && (usage?.uses ?? 0) >= coupon.usage_limit) {
    return { label: "Used up", className: "bg-danger/10 text-danger" };
  }
  if (coupon.starts_at && now < new Date(coupon.starts_at).getTime()) {
    return { label: "Scheduled", className: "bg-warning/10 text-warning " };
  }
  return { label: "Active", className: "bg-success/10 text-success " };
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [usage, setUsage] = useState<Map<string, Usage>>(new Map());
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data, error }, { data: usageRows }] = await Promise.all([
      supabase.from("coupons").select(COUPON_SELECT).order("created_at", { ascending: false }),
      supabase.rpc("coupon_usage"),
    ]);

    if (error) {
      console.log("Coupons load error:", error);
      setLoadError(error.message.includes("coupons") ? "Coupons table not found. Run the coupons migration in Supabase." : error.message);
      return;
    }

    setCoupons((data ?? []) as Coupon[]);
    setUsage(
      new Map(
        ((usageRows ?? []) as { coupon_id: string; uses: number; paid_uses: number }[]).map((row) => [
          row.coupon_id,
          { uses: Number(row.uses), paidUses: Number(row.paid_uses) },
        ])
      )
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const toggleActive = async (coupon: Coupon) => {
    setBusyId(coupon.id);
    const { error } = await supabase.from("coupons").update({ is_active: !coupon.is_active }).eq("id", coupon.id);
    setBusyId(null);
    if (error) setNotice(error.message);
    else load();
  };

  const remove = async (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}? This can't be undone.`)) return;

    setBusyId(coupon.id);
    const { error } = await supabase.from("coupons").delete().eq("id", coupon.id);
    setBusyId(null);

    if (error) setNotice(error.message.includes("has been used") ? `${coupon.code} has been used, so it can't be deleted. Switch it off instead.` : error.message);
    else load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Coupons</h1>
          <p className="mt-1 text-muted-foreground">
            Discount codes customers can apply on the cart page or at checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY_DRAFT })}
          className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background"
        >
          <Plus size={16} /> New coupon
        </button>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {loadError ? (
        <p className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">{loadError}</p>
      ) : !coupons ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading coupons…
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <TicketPercent className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No coupons yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create one, e.g. WELCOME10 for 10% off a first order.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {coupons.map((coupon) => {
              const used = usage.get(coupon.id);
              const status = couponStatus(coupon, used);
              const validity = [
                coupon.starts_at && `from ${formatDate(coupon.starts_at)}`,
                coupon.expires_at && `until ${formatDate(coupon.expires_at)}`,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <li key={coupon.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-dashed border-border bg-background px-2.5 py-1 font-mono text-sm font-bold tracking-wide">
                        {coupon.code}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                    </div>
                    <p className="mt-2 text-sm">{describeCoupon(coupon)}</p>
                    {coupon.description && <p className="text-xs text-muted-foreground">Shown to customers: {coupon.description}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {used?.uses ?? 0}
                      {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""} uses ({used?.paidUses ?? 0} paid)
                      {coupon.per_user_limit ? ` · ${coupon.per_user_limit} per customer` : " · unlimited per customer"}
                      {validity && ` · ${validity}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(coupon)}
                      disabled={busyId === coupon.id}
                      className={`relative h-6 w-11 rounded-full transition disabled:opacity-50 ${coupon.is_active ? "bg-success" : "bg-zinc-400"}`}
                      aria-label={coupon.is_active ? `Switch off ${coupon.code}` : `Switch on ${coupon.code}`}
                      aria-pressed={coupon.is_active}
                    >
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${coupon.is_active ? "left-6" : "left-1"}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft(toDraft(coupon))}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${coupon.code}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(coupon)}
                      disabled={busyId === coupon.id}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                      aria-label={`Delete ${coupon.code}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {draft && (
        <CouponForm
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10";
const labelClass = "block text-sm font-medium";
const hintClass = "mt-1 text-xs text-muted-foreground";

const randomCode = () =>
  `ZFS${Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("")}`;

function CouponForm({ draft: initial, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const isPercent = draft.discount_type === "percent";

  // Preview on a few cart values.
  const previewCoupon = {
    discount_type: draft.discount_type,
    discount_value: num(draft.discount_value) ?? 0,
    max_discount: isPercent ? num(draft.max_discount) : null,
  };
  const minOrder = num(draft.min_order_amount) ?? 0;
  const samples = [499, 999, 1999, 4999].filter((amount) => amount >= minOrder).slice(0, 3);
  if (samples.length === 0) samples.push(minOrder);

  const save = async () => {
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);

    const row = {
      code: normalizeCouponCode(draft.code),
      description: draft.description.trim() || null,
      discount_type: draft.discount_type,
      discount_value: Number(draft.discount_value),
      max_discount: isPercent ? num(draft.max_discount) : null,
      min_order_amount: num(draft.min_order_amount) ?? 0,
      starts_at: fromLocalInput(draft.starts_at),
      expires_at: fromLocalInput(draft.expires_at),
      usage_limit: num(draft.usage_limit),
      per_user_limit: num(draft.per_user_limit),
      is_active: draft.is_active,
    };

    const { error: saveError } = draft.id
      ? await supabase.from("coupons").update(row).eq("id", draft.id)
      : await supabase.from("coupons").insert(row);

    setSaving(false);

    if (saveError) {
      console.log("Save coupon error:", saveError);
      setError(saveError.code === "23505" ? `A coupon with the code ${row.code} already exists.` : saveError.message);
      return;
    }

    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-form-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="coupon-form-title" className="text-lg font-semibold">
            {draft.id ? `Edit ${initial.code}` : "New coupon"}
          </h2>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {/* Code */}
          <div>
            <label htmlFor="coupon-code-input" className={labelClass}>
              Code
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="coupon-code-input"
                value={draft.code}
                onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30))}
                placeholder="e.g. WELCOME10"
                className={`${inputClass} mt-0 font-mono uppercase tracking-wide`}
              />
              <button
                type="button"
                onClick={() => set("code", randomCode())}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-sm hover:bg-muted"
              >
                <Shuffle size={14} /> Random
              </button>
            </div>
            <p className={hintClass}>What customers type. Not case-sensitive.</p>
          </div>

          {/* Discount */}
          <div>
            <span className={labelClass}>Discount</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["percent", "fixed"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("discount_type", type)}
                  aria-pressed={draft.discount_type === type}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    draft.discount_type === type ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
                  }`}
                >
                  {type === "percent" ? "Percentage (%)" : "Fixed amount (₹)"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="coupon-value" className={labelClass}>
                {isPercent ? "Percent off" : "Amount off (₹)"}
              </label>
              <input
                id="coupon-value"
                inputMode="numeric"
                value={draft.discount_value}
                onChange={(e) => set("discount_value", digits(e.target.value))}
                placeholder={isPercent ? "e.g. 10" : "e.g. 100"}
                className={inputClass}
              />
            </div>
            {isPercent && (
              <div>
                <label htmlFor="coupon-max" className={labelClass}>
                  Maximum discount (₹)
                </label>
                <input
                  id="coupon-max"
                  inputMode="numeric"
                  value={draft.max_discount}
                  onChange={(e) => set("max_discount", digits(e.target.value))}
                  placeholder="No limit"
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label htmlFor="coupon-min" className={labelClass}>
                Minimum order (₹)
              </label>
              <input
                id="coupon-min"
                inputMode="numeric"
                value={draft.min_order_amount}
                onChange={(e) => set("min_order_amount", digits(e.target.value))}
                placeholder="None"
                className={inputClass}
              />
              <p className={hintClass}>Products total, before shipping.</p>
            </div>
          </div>

          {/* Limits */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="coupon-usage" className={labelClass}>
                Total uses
              </label>
              <input
                id="coupon-usage"
                inputMode="numeric"
                value={draft.usage_limit}
                onChange={(e) => set("usage_limit", digits(e.target.value))}
                placeholder="Unlimited"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="coupon-per-user" className={labelClass}>
                Uses per customer
              </label>
              <input
                id="coupon-per-user"
                inputMode="numeric"
                value={draft.per_user_limit}
                onChange={(e) => set("per_user_limit", digits(e.target.value))}
                placeholder="Unlimited"
                className={inputClass}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="coupon-start" className={labelClass}>
                Starts
              </label>
              <input
                id="coupon-start"
                type="datetime-local"
                value={draft.starts_at}
                onChange={(e) => set("starts_at", e.target.value)}
                className={inputClass}
              />
              <p className={hintClass}>Empty = immediately.</p>
            </div>
            <div>
              <label htmlFor="coupon-end" className={labelClass}>
                Ends
              </label>
              <input
                id="coupon-end"
                type="datetime-local"
                value={draft.expires_at}
                onChange={(e) => set("expires_at", e.target.value)}
                className={inputClass}
              />
              <p className={hintClass}>Empty = never expires.</p>
            </div>
          </div>

          <div>
            <label htmlFor="coupon-description" className={labelClass}>
              Description for customers <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="coupon-description"
              value={draft.description}
              onChange={(e) => set("description", e.target.value.slice(0, 200))}
              placeholder={draft.discount_value ? describeCoupon({ ...previewCoupon, min_order_amount: minOrder }) : "e.g. Diwali sale"}
              className={inputClass}
            />
            <p className={hintClass}>Shown when the coupon is applied. Empty = the discount summary.</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="accent-brand"
            />
            Active (customers can use it)
          </label>

          {/* Preview */}
          {previewCoupon.discount_value > 0 && (
            <div className="rounded-xl bg-muted p-3 text-sm">
              <p className="font-medium">Preview</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {samples.map((amount) => {
                  const off = couponDiscount(previewCoupon, amount, 0);
                  return (
                    <li key={amount}>
                      Cart of {formatINR(amount)} → {formatINR(off)} off, pays {formatINR(amount - off)} + shipping
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
        </div>

        <div className="flex gap-3 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-medium text-background disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {draft.id ? "Save changes" : "Create coupon"}
          </button>
        </div>
      </div>
    </div>
  );
}
