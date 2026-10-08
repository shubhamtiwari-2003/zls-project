"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Check, Copy, ExternalLink, Loader2, Package, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatINR } from "@/lib/shop-config";
import {
  FULFILLMENT_LABELS,
  FULFILLMENT_STEPS,
  SHIPPING_STATUSES,
  TONE_CLASSES,
  fulfillmentStepIndex,
  orderStatusBadge,
  type FulfillmentStatus,
} from "@/lib/order-status";
import {
  ADMIN_ORDER_SELECT,
  formatOrderDate,
  toAdminOrder,
  type AdminOrder,
} from "@/components/admin/orders/adminOrders";
import { OrderItemCustomization } from "@/components/admin/orders/OrderItemCustomization";

interface StatusEvent {
  id: string;
  status: string;
  note: string | null;
  source: string;
  created_at: string;
}

interface OrderDetailDrawerProps {
  order: AdminOrder;
  onClose: () => void;
  onUpdated: (order: AdminOrder) => void;
}

export function OrderDetailDrawer({ order, onClose, onUpdated }: OrderDetailDrawerProps) {
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [status, setStatus] = useState<FulfillmentStatus>(order.fulfillment_status as FulfillmentStatus);
  const [courier, setCourier] = useState(order.courier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const badge = orderStatusBadge(order);
  const canFulfill = order.payment_status === "paid" && order.status !== "canceled";
  const currentStep = fulfillmentStepIndex(order.fulfillment_status);
  const showTracking = SHIPPING_STATUSES.includes(status);

  const loadEvents = useCallback(async () => {
    const { data, error: eventsError } = await supabase
      .from("order_status_events")
      .select("id, status, note, source, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (eventsError) console.log("Order events error:", eventsError);
    setEvents((data ?? []) as StatusEvent[]);
  }, [order.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, [loadEvents]);

  // Close on Escape.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const dirty =
    status !== order.fulfillment_status ||
    note.trim() !== "" ||
    courier.trim() !== (order.courier ?? "") ||
    trackingNumber.trim() !== (order.tracking_number ?? "") ||
    trackingUrl.trim() !== (order.tracking_url ?? "");

  const handleSave = async () => {
    if (!dirty || saving) return;

    if (trackingUrl.trim() && !/^https?:\/\//i.test(trackingUrl.trim())) {
      setError("Tracking link must start with http:// or https://");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updateError } = await supabase.rpc("update_order_fulfillment", {
      p_order_id: order.id,
      p_status: status,
      p_note: note.trim() || null,
      p_courier: courier.trim() || null,
      p_tracking_number: trackingNumber.trim() || null,
      p_tracking_url: trackingUrl.trim() || null,
    });

    if (updateError) {
      console.log("Update fulfillment error:", updateError);
      setError(updateError.message);
      setSaving(false);
      return;
    }

    // Reload the order so the list shows the saved values.
    const { data } = await supabase.from("orders").select(ADMIN_ORDER_SELECT).eq("id", order.id).maybeSingle();

    if (data) onUpdated(toAdminOrder(data));

    setNote("");
    setSaving(false);
    setSaved(true);
    loadEvents();
  };

  const address = order.shipping_address;
  const addressText = address
    ? [
        address.full_name,
        address.line1,
        address.line2,
        `${address.city}, ${address.state ?? ""} ${address.postal_code}`.trim(),
        address.phone ? `Phone: ${address.phone}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(addressText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard not available; ignore.
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={() => !saving && onClose()} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-drawer-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id="order-drawer-title" className="font-mono text-lg font-bold">
              {order.order_number}
            </h2>
            <p className="text-xs text-muted-foreground">Placed {formatOrderDate(order.placed_at)}</p>
            <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASSES[badge.tone]}`}>
              {badge.label}
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* Fulfillment */}
          <section className="space-y-4 rounded-2xl border border-border p-4">
            <div>
              <h3 className="font-semibold">Shipping status</h3>
              <p className="text-xs text-muted-foreground">
                {canFulfill
                  ? "Move the order forward as you print and ship it. The customer sees this on their order page."
                  : order.status === "canceled"
                    ? "This order was canceled, so it can't be shipped."
                    : "Waiting for payment. Shipping can be updated once the order is paid."}
              </p>
            </div>

            {canFulfill && (
              <>
                <div className="flex flex-wrap gap-2">
                  {FULFILLMENT_STEPS.map((step, index) => {
                    const selected = status === step.value;
                    const done = index <= currentStep;

                    return (
                      <button
                        key={step.value}
                        type="button"
                        onClick={() => {
                          setStatus(step.value);
                          setSaved(false);
                        }}
                        disabled={saving}
                        aria-pressed={selected}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          selected
                            ? "border-foreground bg-foreground text-background"
                            : done
                              ? "border-success/40 text-success "
                              : "border-border text-muted-foreground hover:border-foreground/40"
                        }`}
                      >
                        {done && !selected && <Check size={12} />}
                        {index + 1}. {step.label}
                      </button>
                    );
                  })}
                </div>

                {status !== order.fulfillment_status && (
                  <p className="text-xs text-muted-foreground">
                    {FULFILLMENT_LABELS[order.fulfillment_status as FulfillmentStatus] ?? order.fulfillment_status} →{" "}
                    <span className="font-semibold text-foreground">{FULFILLMENT_LABELS[status]}</span>
                    {fulfillmentStepIndex(status) < currentStep && " (moving back)"}
                  </p>
                )}

                {showTracking && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium">
                      Courier
                      <input
                        value={courier}
                        onChange={(e) => setCourier(e.target.value)}
                        placeholder="e.g. Delhivery"
                        maxLength={60}
                        disabled={saving}
                        className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal"
                      />
                    </label>
                    <label className="text-xs font-medium">
                      Tracking number (AWB)
                      <input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. 1234567890"
                        maxLength={60}
                        disabled={saving}
                        className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal"
                      />
                    </label>
                    <label className="text-xs font-medium sm:col-span-2">
                      Tracking link (optional)
                      <input
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        placeholder="https://…"
                        maxLength={500}
                        disabled={saving}
                        className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal"
                      />
                    </label>
                  </div>
                )}

                <label className="block text-xs font-medium">
                  Note (optional, saved in the history)
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={500}
                    disabled={saving}
                    placeholder="e.g. Reprinted due to colour issue"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal"
                  />
                </label>

                {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

                <div className="flex items-center justify-end gap-3">
                  {saved && !dirty && (
                    <span className="flex items-center gap-1 text-sm text-success">
                      <Check size={16} /> Saved
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                    className="flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-40"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    Update order
                  </button>
                </div>
              </>
            )}
          </section>

          {/* Items */}
          <section>
            <h3 className="mb-3 font-semibold">Items</h3>
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 p-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
                    {item.image_url ? (
                      <Image src={item.image_url} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <Package size={18} className="m-auto mt-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{item.product_name ?? "Product"}</p>
                    {item.variant_title && <p className="text-xs text-muted-foreground">{item.variant_title}</p>}
                    {item.sku && <p className="text-xs text-muted-foreground">SKU {item.sku}</p>}
                    <OrderItemCustomization entries={item.customization} />
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">× {item.quantity}</p>
                    <p className="text-xs text-muted-foreground">{formatINR(Number(item.total_price))}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(Number(order.subtotal_amount))}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-success ">
                  <span>Coupon{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
                  <span>−{formatINR(Number(order.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{Number(order.shipping_amount) === 0 ? "FREE" : formatINR(Number(order.shipping_amount))}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatINR(Number(order.total_amount))}</span>
              </div>
            </div>
          </section>

          {/* Address */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Ship to</h3>
              {address && (
                <button
                  type="button"
                  onClick={copyAddress}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy address"}
                </button>
              )}
            </div>
            {address ? (
              <p className="whitespace-pre-line rounded-2xl border border-border p-4 text-sm">{addressText}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No address on this order.</p>
            )}
          </section>

          {/* Payment */}
          <section className="space-y-1 text-sm">
            <h3 className="mb-2 font-semibold">Payment</h3>
            <p>
              <span className="text-muted-foreground">Status: </span>
              {order.payment_status === "paid" ? `Paid ${formatOrderDate(order.paid_at)}` : "Not paid"}
            </p>
            {order.razorpay_payment_id && (
              <p>
                <span className="text-muted-foreground">Razorpay payment: </span>
                <span className="font-mono text-xs">{order.razorpay_payment_id}</span>
              </p>
            )}
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-info hover:underline"
              >
                Open tracking <ExternalLink size={12} />
              </a>
            )}
          </section>

          {/* History */}
          <section>
            <h3 className="mb-3 font-semibold">History</h3>
            <ol className="space-y-3 border-l border-border pl-4 text-sm">
              <li>
                <p className="font-medium">Order placed</p>
                <p className="text-xs text-muted-foreground">{formatOrderDate(order.placed_at)}</p>
              </li>
              {order.paid_at && (
                <li>
                  <p className="font-medium">Payment received</p>
                  <p className="text-xs text-muted-foreground">{formatOrderDate(order.paid_at)}</p>
                </li>
              )}
              {order.canceled_at && (
                <li>
                  <p className="font-medium text-danger">Canceled</p>
                  <p className="text-xs text-muted-foreground">{formatOrderDate(order.canceled_at)}</p>
                </li>
              )}
              {events.map((event) => (
                <li key={event.id}>
                  <p className="font-medium">
                    {FULFILLMENT_LABELS[event.status as FulfillmentStatus] ?? event.status}
                    {event.source === "courier" && <span className="ml-1 text-xs text-muted-foreground">(courier)</span>}
                  </p>
                  {event.note && <p className="text-muted-foreground">{event.note}</p>}
                  <p className="text-xs text-muted-foreground">{formatOrderDate(event.created_at)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </aside>
    </div>
  );
}
