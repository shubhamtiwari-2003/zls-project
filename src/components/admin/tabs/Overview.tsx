"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, IndianRupee, Loader2, ShoppingCart, Truck, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/features/auth/store/authStore";
import { formatINR } from "@/lib/shop-config";
import { LowStockPanel } from "@/components/admin/LowStockPanel";
import { RecentOrdersPanel } from "@/components/admin/orders/RecentOrdersPanel";
import { RevenueChart, fillDays, rangeStart, type SalesReport } from "@/components/admin/tabs/Sales";

/*
  Store at a glance, from real data:
    • last 30 days (IST) vs the 30 days before: revenue, orders, customers
    • paid orders still to ship
    • revenue for the last 7 days, low stock, recent orders
*/

const PERIOD_DAYS = 30;
const DAY_MS = 86_400_000;

interface OverviewData {
  current: SalesReport;
  previous: SalesReport;
  toShip: number;
}

/** Change vs the previous period; null when there's nothing to compare with. */
function change(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

export default function Overview() {
  const profile = useAuthStore((state) => state.profile);
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const start = rangeStart("30"); // PERIOD_DAYS, from midnight IST
    const previousStart = new Date(start.getTime() - PERIOD_DAYS * DAY_MS);

    Promise.all([
      supabase.rpc("admin_sales_report", { p_from: start.toISOString(), p_to: new Date().toISOString() }),
      supabase.rpc("admin_sales_report", { p_from: previousStart.toISOString(), p_to: start.toISOString() }),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid")
        .neq("status", "canceled")
        .neq("fulfillment_status", "delivered"),
    ]).then(([current, previous, toShip]) => {
      if (cancelled) return;

      const failure = current.error ?? previous.error;
      if (failure) {
        setError(failure.message.includes("admin_sales_report") ? "Run the finance migration in Supabase to see store figures." : failure.message);
        return;
      }

      setData({
        current: current.data as SalesReport,
        previous: previous.data as SalesReport,
        toShip: toShip.count ?? 0,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const name = profile?.first_name || profile?.display_name?.split(" ")[0];
  const now = data?.current.totals;
  const before = data?.previous.totals;
  const revenue = Number(now?.revenue ?? 0);
  const orders = Number(now?.orders ?? 0);

  const cards = [
    {
      title: "Revenue",
      value: formatINR(revenue),
      delta: change(revenue, Number(before?.revenue ?? 0)),
      icon: IndianRupee,
    },
    {
      title: "Orders",
      value: orders.toLocaleString("en-IN"),
      delta: change(orders, Number(before?.orders ?? 0)),
      icon: ShoppingCart,
    },
    {
      title: "Customers",
      value: Number(now?.customers ?? 0).toLocaleString("en-IN"),
      delta: change(Number(now?.customers ?? 0), Number(before?.customers ?? 0)),
      icon: Users,
    },
  ];

  // Last 7 days, taken from the 30-day report.
  const weekStart = rangeStart("7");
  const week = data ? fillDays(weekStart, data.current.daily) : [];
  const weekRevenue = week.reduce((sum, day) => sum + day.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="mt-1 text-muted-foreground">
            {name ? `Welcome back, ${name}. ` : ""}Here&apos;s how the store did in the last {PERIOD_DAYS} days.
          </p>
        </div>

        <Link
          href="/admin?tab=sales"
          className="inline-flex items-center gap-2 self-start rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-muted md:self-auto"
        >
          <BarChart3 size={16} /> View sales report
        </Link>
      </section>

      {error && <p className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">{error}</p>}

      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const up = (card.delta ?? 0) >= 0;

          return (
            <div key={card.title} className="rounded-3xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <div className="rounded-xl bg-muted p-2">
                  <Icon size={18} />
                </div>
              </div>

              <p className="mt-5 text-3xl font-semibold">{data ? card.value : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}</p>

              <p className="mt-3 flex items-center gap-1 text-sm">
                {data && card.delta !== null ? (
                  <>
                    <span className={`flex items-center gap-0.5 font-medium ${up ? "text-success" : "text-danger"}`}>
                      {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {up ? "+" : ""}
                      {card.delta}%
                    </span>
                    <span className="text-muted-foreground">vs previous {PERIOD_DAYS} days</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Last {PERIOD_DAYS} days</span>
                )}
              </p>
            </div>
          );
        })}

        {/* Needs action */}
        <Link
          href="/admin?tab=orders"
          className="group rounded-3xl border border-border bg-surface p-5 transition hover:border-foreground/30"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">To ship</p>
            <div className="rounded-xl bg-muted p-2">
              <Truck size={18} />
            </div>
          </div>
          <p className="mt-5 text-3xl font-semibold">{data ? data.toShip.toLocaleString("en-IN") : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}</p>
          <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
            Paid, not yet delivered
            <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </p>
        </Link>
      </section>

      {/* Revenue + Low stock */}
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr] *:min-w-0">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between px-1">
            <p className="text-sm text-muted-foreground">Last 7 days</p>
            <p className="text-lg font-semibold">{data ? formatINR(weekRevenue) : "—"}</p>
          </div>
          {data ? (
            <RevenueChart days={week} />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-3xl border border-border bg-surface text-sm text-muted-foreground">
              {error ? "No data" : <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
          )}
        </div>

        <LowStockPanel />
      </section>

      {/* Recent orders */}
      <RecentOrdersPanel />
    </div>
  );
}
