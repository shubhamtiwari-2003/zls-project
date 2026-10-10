import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/shop-config";
import { TONE_CLASSES, orderStatusBadge } from "@/lib/order-status";

export const metadata: Metadata = {
  title: "My Orders | Z Factor Studio",
};

interface OrderListRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string | null;
  total_amount: number;
  placed_at: string;
  order_items: { quantity: number }[];
}

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/orders");

  // RLS returns only this user's orders.
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, fulfillment_status, total_amount, placed_at, order_items ( quantity )")
    .eq("user_id", user.id)
    .order("placed_at", { ascending: false });

  if (error) console.error("Orders list error:", error);

  const orders = (data ?? []) as OrderListRow[];

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">My Orders</h1>

        {error ? (
          <p className="mt-8 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            Could not load your orders. Please try again.
          </p>
        ) : orders.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <Package className="h-14 w-14 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No orders yet</h2>
            <p className="mt-2 text-muted-foreground">When you place an order, it will show up here.</p>
            <Link href="/products" className="mt-6 rounded-full bg-foreground px-6 py-3 font-medium text-background">
              Start Shopping
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {orders.map((order) => {
              const badge = orderStatusBadge(order);
              const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:border-foreground/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{order.order_number}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[badge.tone]}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {new Date(order.placed_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {" · "}
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </p>
                    </div>

                    <span className="font-semibold">{formatINR(Number(order.total_amount))}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
