"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatINR } from "@/lib/shop-config";
import { TONE_CLASSES, orderStatusBadge } from "@/lib/order-status";
import {
  ADMIN_ORDER_SELECT,
  formatOrderDate,
  toAdminOrder,
  type AdminOrder,
} from "@/components/admin/orders/adminOrders";

const RECENT_COUNT = 5;

// Overview card: the latest orders, each linking to its detail in the Orders tab.
export function RecentOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("orders")
      .select(ADMIN_ORDER_SELECT)
      .order("placed_at", { ascending: false })
      .limit(RECENT_COUNT)
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;

        if (fetchError) {
          console.log("Recent orders error:", fetchError);
          setError(true);
          return;
        }

        setOrders((data ?? []).map(toAdminOrder));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-3xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border p-6">
        <div>
          <h2 className="text-xl font-semibold">Recent Orders</h2>
          <p className="text-sm text-muted-foreground">Latest customer purchases</p>
        </div>

        <Link href="/admin?tab=orders" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </div>

      {error ? (
        <p className="p-6 text-sm text-red-600">Could not load orders.</p>
      ) : orders === null ? (
        <p className="p-6 text-sm text-muted-foreground">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="text-left text-sm text-muted-foreground">
                <th className="px-6 py-4 font-medium">Order</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const badge = orderStatusBadge(order);
                const first = order.order_items[0];
                const more = order.order_items.length - 1;
                const href = `/admin?tab=orders&order=${order.id}`;

                return (
                  <tr key={order.id} className="border-t border-border transition hover:bg-background">
                    <td className="px-6 py-4">
                      <Link href={href} className="font-mono text-sm font-semibold hover:underline">
                        {order.order_number}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatOrderDate(order.placed_at)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm">{order.shipping_address?.full_name ?? "—"}</td>
                    <td className="px-6 py-4 text-sm">
                      {first?.product_name ?? "—"}
                      {first?.variant_title && <span className="text-muted-foreground"> · {first.variant_title}</span>}
                      {more > 0 && <span className="text-muted-foreground"> +{more} more</span>}
                    </td>
                    <td className="px-6 py-4 font-medium">{formatINR(Number(order.total_amount))}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASSES[badge.tone]}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={href} className="text-muted-foreground hover:text-foreground" aria-label={`Open ${order.order_number}`}>
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
