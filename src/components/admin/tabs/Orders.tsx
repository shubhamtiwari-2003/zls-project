"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatINR } from "@/lib/shop-config";
import { TONE_CLASSES, orderStatusBadge } from "@/lib/order-status";
import {
  ADMIN_ORDER_SELECT,
  formatOrderDate,
  itemCount,
  toAdminOrder,
  type AdminOrder,
} from "@/components/admin/orders/adminOrders";
import { OrderDetailDrawer } from "@/components/admin/orders/OrderDetailDrawer";

type OrderFilter = "all" | "to_print" | "printing" | "shipping" | "delivered" | "pending" | "canceled";

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "to_print", label: "New (to print)" },
  { value: "printing", label: "Printing" },
  { value: "shipping", label: "Shipping" },
  { value: "delivered", label: "Delivered" },
  { value: "pending", label: "Payment pending" },
  { value: "canceled", label: "Canceled" },
];

const MAX_ORDERS = 300;

function matchesFilter(order: AdminOrder, filter: OrderFilter): boolean {
  const paid = order.payment_status === "paid" && order.status !== "canceled";

  switch (filter) {
    case "all":
      return true;
    case "to_print":
      return paid && order.fulfillment_status === "unfulfilled";
    case "printing":
      return paid && order.fulfillment_status === "printing";
    case "shipping":
      return paid && ["out_for_shipping", "in_transit", "out_for_delivery"].includes(order.fulfillment_status);
    case "delivered":
      return paid && order.fulfillment_status === "delivered";
    case "pending":
      return order.status !== "canceled" && order.payment_status !== "paid";
    case "canceled":
      return order.status === "canceled";
  }
}

export default function Orders() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?order=<id> opens the drawer (deep link from the Overview).
  const selectedId = searchParams.get("order");

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OrderFilter>("all");

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from("orders")
      .select(ADMIN_ORDER_SELECT)
      .order("placed_at", { ascending: false })
      .limit(MAX_ORDERS);

    if (fetchError) {
      console.log("Orders fetch error:", fetchError);
      setError(fetchError.message || "Failed to load orders.");
    } else {
      setOrders((data ?? []).map(toAdminOrder));
      setError("");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.value, orders.filter((o) => matchesFilter(o, f.value)).length])),
    [orders]
  ) as Record<OrderFilter, number>;

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (!matchesFilter(order, filter)) return false;
      if (!query) return true;

      return (
        order.order_number.toLowerCase().includes(query) ||
        order.shipping_address?.full_name.toLowerCase().includes(query) ||
        order.shipping_address?.phone?.includes(query) ||
        order.tracking_number?.toLowerCase().includes(query)
      );
    });
  }, [orders, search, filter]);

  const selected = orders.find((order) => order.id === selectedId) ?? null;

  const openOrder = (id: string) =>
    router.replace(`/admin?tab=orders&order=${id}`, { scroll: false });

  const closeOrder = useCallback(
    () => router.replace("/admin?tab=orders", { scroll: false }),
    [router]
  );

  const handleUpdated = (updated: AdminOrder) =>
    setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="mt-1 text-muted-foreground">Track payments and move orders through printing and shipping.</p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 self-start rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* FILTERS */}
      <div className="space-y-3 rounded-3xl border border-border bg-surface p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number, customer, phone or tracking number..."
            className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                filter === f.value ? "bg-foreground text-background" : "border border-border hover:bg-background"
              }`}
            >
              {f.label} ({counts[f.value] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-border">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="px-6 py-4 font-medium">Order</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Items</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>

            <tbody>
              {loading && orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    Loading orders...
                  </td>
                </tr>
              )}

              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    {orders.length === 0 ? "No orders yet." : "No orders match."}
                  </td>
                </tr>
              )}

              {visible.map((order) => {
                const badge = orderStatusBadge(order);
                const first = order.order_items[0];

                return (
                  <tr
                    key={order.id}
                    onClick={() => openOrder(order.id)}
                    className="cursor-pointer border-b border-border transition last:border-0 hover:bg-background"
                  >
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm font-semibold">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{formatOrderDate(order.placed_at)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <p className="font-medium">{order.shipping_address?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {[order.shipping_address?.city, order.shipping_address?.phone].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <p className="line-clamp-1">
                        {first?.product_name ?? "—"}
                        {first?.variant_title && <span className="text-muted-foreground"> · {first.variant_title}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {itemCount(order)} {itemCount(order) === 1 ? "item" : "items"}
                        {order.order_items.length > 1 && ` · ${order.order_items.length} products`}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-semibold">{formatINR(Number(order.total_amount))}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASSES[badge.tone]}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <ChevronRight size={18} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {orders.length >= MAX_ORDERS && (
          <p className="border-t border-border px-6 py-3 text-xs text-muted-foreground">Showing the latest {MAX_ORDERS} orders.</p>
        )}
      </div>

      {selected && (
        <OrderDetailDrawer key={selected.id} order={selected} onClose={closeOrder} onUpdated={handleUpdated} />
      )}
    </div>
  );
}
