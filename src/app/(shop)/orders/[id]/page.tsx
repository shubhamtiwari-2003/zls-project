import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, CheckCircle2, Clock, ExternalLink, FileDown, PackageCheck, Truck, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/shop-config";
import { FULFILLMENT_LABELS, FULFILLMENT_STEPS, fulfillmentStepIndex, type FulfillmentStatus } from "@/lib/order-status";
import { CartItemCustomization } from "@/features/cart/components/CartItemCustomization";
import { customerUploadPreviewUrl } from "@/lib/customer-uploads.server";
import type { CustomizationDisplay, CustomizationSnapshotEntry } from "@/lib/customization";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string | null;
  courier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  subtotal_amount: number;
  shipping_amount: number;
  discount_amount: number;
  coupon_code: string | null;
  total_amount: number;
  placed_at: string;
  order_items: {
    id: string;
    product_name: string | null;
    variant_title: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    customization: CustomizationSnapshotEntry[] | null;
  }[];
  shipping_address: {
    full_name: string;
    phone: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postal_code: string;
  } | null;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/sign-in?next=/orders/${id}`);
  if (!UUID_RE.test(id)) notFound();

  // RLS only returns the order if it belongs to this user.
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, payment_status,
       fulfillment_status, courier, tracking_number, tracking_url,
       subtotal_amount, shipping_amount, discount_amount, coupon_code, total_amount, placed_at,
       order_items ( id, product_name, variant_title, quantity, unit_price, total_price, customization ),
       shipping_address:addresses!shipping_address_id (
         full_name, phone, line1, line2, city, state, postal_code
       )`
    )
    .eq("id", id)
    .maybeSingle();

  if (error) console.error("Order page error:", error);
  if (!data) notFound();

  const order = data as unknown as OrderRow;

  // Personalisation as shown to the customer (their photos via signed links).
  const customizationOf = (entries: CustomizationSnapshotEntry[] | null): CustomizationDisplay[] =>
    (entries ?? []).map((entry) => ({
      key: entry.key,
      label: entry.label,
      value: entry.type === "image" ? "Your photo" : entry.value,
      imageUrl: entry.publicId ? customerUploadPreviewUrl(entry.publicId, 300) : null,
    }));
  const paid = order.payment_status === "paid";
  const canceled = order.status === "canceled";

  const fulfillment = (order.fulfillment_status ?? "unfulfilled") as FulfillmentStatus;
  const delivered = paid && fulfillment === "delivered";
  const shipping = paid && fulfillment !== "unfulfilled" && !delivered;
  const step = fulfillmentStepIndex(fulfillment);

  const StatusIcon = delivered ? PackageCheck : shipping ? Truck : paid ? CheckCircle2 : canceled ? XCircle : Clock;

  const heading = canceled
    ? "Order canceled"
    : delivered
      ? "Delivered"
      : shipping
        ? FULFILLMENT_LABELS[fulfillment]
        : paid
          ? "Order confirmed"
          : "Payment pending";

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <StatusIcon
            className={`mx-auto h-14 w-14 ${paid ? "text-success" : canceled ? "text-danger" : "text-warning"}`}
          />
          <h1 className="mt-4 text-3xl font-bold">{heading}</h1>
          <p className="mt-2 text-muted-foreground">
            {delivered
              ? "Your order has been delivered. Enjoy!"
              : shipping
                ? "Your order is on its way to you."
                : paid
                  ? "Thank you! We've received your payment and will start printing soon."
              : canceled
                ? "This order was canceled and you have not been charged."
                : "If you completed the payment, it will be confirmed here shortly."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Order <span className="font-mono font-semibold text-foreground">{order.order_number}</span>
          </p>

          {/* Invoice (issued when the payment succeeds) */}
          {paid && (
            <a
              href={`/api/invoices/${order.id}`}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-surface"
            >
              <FileDown className="h-4 w-4" />
              Download invoice
            </a>
          )}
        </div>

        {/* Shipping progress */}
        {paid && !canceled && (
          <div className="mt-10 rounded-3xl border border-border bg-surface p-6">
            <ol className="grid grid-cols-5 gap-2">
              {FULFILLMENT_STEPS.map((s, index) => {
                const done = index <= step;
                return (
                  <li key={s.value} className="flex flex-col items-center text-center">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        done ? "border-success bg-success text-white" : "border-border text-muted-foreground"
                      }`}
                    >
                      {done ? <Check size={14} /> : index + 1}
                    </span>
                    <span className={`mt-2 text-[11px] leading-tight sm:text-xs ${done ? "font-semibold" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {(order.courier || order.tracking_number) && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
                <p>
                  {order.courier && <span className="font-medium">{order.courier}</span>}
                  {order.tracking_number && (
                    <span className="text-muted-foreground">
                      {order.courier ? " · " : ""}Tracking no. <span className="font-mono">{order.tracking_number}</span>
                    </span>
                  )}
                </p>
                {order.tracking_url && /^https?:\/\//i.test(order.tracking_url) && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-info hover:underline"
                  >
                    Track shipment <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-border bg-surface p-6">
          <ul className="divide-y divide-border">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  {item.product_name ?? "Product"} × {item.quantity}
                  {item.variant_title && <span className="block text-xs text-muted-foreground">{item.variant_title}</span>}
                  <CartItemCustomization entries={customizationOf(item.customization)} className="mt-1.5" />
                </div>
                <span className="font-medium">{formatINR(Number(item.total_price))}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
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
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatINR(Number(order.total_amount))}</span>
            </div>
          </div>

          {order.shipping_address && (
            <div className="mt-6 border-t border-border pt-4 text-sm">
              <h2 className="font-semibold">Shipping to</h2>
              <p className="mt-2 text-muted-foreground">
                {order.shipping_address.full_name}
                <br />
                {order.shipping_address.line1}
                {order.shipping_address.line2 && `, ${order.shipping_address.line2}`}
                <br />
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                <br />
                {order.shipping_address.phone}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/products" className="rounded-full bg-foreground px-6 py-3 font-medium text-background">
            Continue Shopping
          </Link>
        </div>
      </section>
    </main>
  );
}
