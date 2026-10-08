"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Table2, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatINR } from "@/lib/shop-config";
import { paymentMethodLabel } from "@/lib/invoices";

/*
  Sales report for paid orders (admin_sales_report RPC). Days are IST
  calendar days. One date-range control scopes every figure on the page.
  Charts are single-series (one hue, --chart-1), so no legend; values are
  in hover tooltips and in the table view.
*/

export interface SalesReport {
  totals: {
    revenue: number;
    orders: number;
    subtotal: number;
    discount: number;
    shipping: number;
    fees: number; // paise
    customers: number;
    coupon_orders: number;
  };
  items_sold: number;
  daily: { day: string; revenue: number; orders: number }[];
  top_products: { name: string; quantity: number; revenue: number }[];
  categories: { name: string; quantity: number; revenue: number }[];
  payment_methods: { method: string; orders: number; revenue: number }[];
}

export type RangeKey = "7" | "30" | "90" | "fy";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "fy", label: "This financial year" },
];

const IST = "Asia/Kolkata";
// YYYY-MM-DD of a moment in India.
const istDay = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: IST });

export function rangeStart(key: RangeKey): Date {
  const now = new Date();
  if (key === "fy") {
    const [year, month] = istDay(now).split("-").map(Number);
    const fyYear = month >= 4 ? year : year - 1;
    return new Date(`${fyYear}-04-01T00:00:00+05:30`);
  }
  const days = Number(key);
  const start = new Date(`${istDay(now)}T00:00:00+05:30`);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

/** Every IST day from start to today, with zero for days without sales. */
export function fillDays(start: Date, daily: SalesReport["daily"]) {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const days: { day: string; revenue: number; orders: number }[] = [];
  const today = istDay(new Date());
  const cursor = new Date(start);

  for (let i = 0; i < 400; i++) {
    const key = istDay(cursor);
    const found = byDay.get(key);
    days.push({ day: key, revenue: Number(found?.revenue ?? 0), orders: Number(found?.orders ?? 0) });
    if (key >= today) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

const TICK_COUNT = 4;

/** Round tick step (1, 2 or 5 × 10ⁿ) so 4 steps cover `value`: ₹0 / 1K / 2K / 3K / 4K. */
function niceStep(value: number): number {
  if (value <= 0) return 25;
  const raw = value / TICK_COUNT;
  const power = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 5, 10].find((s) => s * power >= raw) ?? 10) * power;
}

// ₹950 / ₹2.5K / ₹3K / ₹1.2L (Indian lakh); no trailing ".0".
const compactINR = (amount: number) => {
  const short = (value: number) => String(Number(value.toFixed(1)));
  if (amount >= 100_000) return `₹${short(amount / 100_000)}L`;
  if (amount >= 1000) return `₹${short(amount / 1000)}K`;
  return `₹${amount}`;
};

const dayLabel = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { ...opts, timeZone: IST });

export default function Sales() {
  const [range, setRange] = useState<RangeKey>("30");
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const start = useMemo(() => rangeStart(range), [range]);

  useEffect(() => {
    let cancelled = false;
    // Refetch keeps the previous figures on screen (dimmed) until new ones arrive.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    supabase
      .rpc("admin_sales_report", { p_from: start.toISOString(), p_to: new Date().toISOString() })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        setLoading(false);
        if (rpcError) {
          setError(rpcError.message.includes("admin_sales_report") ? "Run the finance migration in Supabase to see sales." : rpcError.message);
          return;
        }
        setError("");
        setReport(data as SalesReport);
      });

    return () => {
      cancelled = true;
    };
  }, [start]);

  const days = useMemo(() => (report ? fillDays(start, report.daily) : []), [report, start]);
  const t = report?.totals;
  const revenue = Number(t?.revenue ?? 0);
  const orders = Number(t?.orders ?? 0);

  const tiles = [
    { label: "Revenue", value: formatINR(revenue), hint: "Paid orders, incl. shipping" },
    { label: "Orders", value: orders.toLocaleString("en-IN"), hint: `${Number(t?.customers ?? 0)} customers` },
    { label: "Average order", value: formatINR(orders ? Math.round(revenue / orders) : 0), hint: "Revenue ÷ orders" },
    { label: "Items sold", value: Number(report?.items_sold ?? 0).toLocaleString("en-IN"), hint: "Units across orders" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales</h1>
        <p className="mt-1 text-muted-foreground">Paid orders only. Days are in Indian time.</p>
      </div>

      {/* Filters: one row, scopes everything below */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
        {RANGES.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setRange(option.key)}
            aria-pressed={range === option.key}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              range === option.key ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
        {loading && report && <Loader2 size={16} className="ml-1 animate-spin text-muted-foreground" />}
      </div>

      {error && <p className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">{error}</p>}

      {!report && !error ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading sales…
        </div>
      ) : report ? (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map((tile) => (
              <div key={tile.label} className="rounded-3xl border border-border bg-surface p-5">
                <p className="text-sm text-muted-foreground">{tile.label}</p>
                <p className="mt-2 text-2xl font-semibold sm:text-3xl">{tile.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
              </div>
            ))}
          </div>

          {/* How revenue adds up */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-border bg-surface px-5 py-3 text-sm">
            <span>
              <span className="text-muted-foreground">Products </span>
              <span className="font-medium tabular-nums">{formatINR(Number(t?.subtotal ?? 0))}</span>
            </span>
            <span>
              <span className="text-muted-foreground">− Coupon discounts </span>
              <span className="font-medium tabular-nums">{formatINR(Number(t?.discount ?? 0))}</span>
              <span className="text-muted-foreground"> ({Number(t?.coupon_orders ?? 0)} orders)</span>
            </span>
            <span>
              <span className="text-muted-foreground">+ Shipping </span>
              <span className="font-medium tabular-nums">{formatINR(Number(t?.shipping ?? 0))}</span>
            </span>
            <span>
              <span className="text-muted-foreground">= Revenue </span>
              <span className="font-semibold tabular-nums">{formatINR(revenue)}</span>
            </span>
            <span className="sm:ml-auto">
              <span className="text-muted-foreground">Razorpay fees </span>
              <span className="font-medium tabular-nums">{formatINR(Math.round(Number(t?.fees ?? 0) / 100))}</span>
            </span>
          </div>

          <RevenueChart days={days} />

          <div className="grid gap-6 lg:grid-cols-3 *:min-w-0">
            <BarList
              title="Top products"
              empty="No products sold in this period."
              rows={report.top_products.map((p) => ({ label: p.name, value: Number(p.revenue), note: `${p.quantity} sold` }))}
            />
            <BarList
              title="By category"
              empty="No sales in this period."
              rows={report.categories.map((c) => ({ label: c.name, value: Number(c.revenue), note: `${c.quantity} sold` }))}
            />
            <BarList
              title="Payment methods"
              empty="No payments in this period."
              rows={report.payment_methods.map((m) => ({
                label: m.method === "unknown" ? "Not recorded" : paymentMethodLabel(m.method),
                value: Number(m.revenue),
                note: `${m.orders} orders`,
              }))}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         Daily revenue (single series)                      */
/* -------------------------------------------------------------------------- */

export function RevenueChart({ days }: { days: { day: string; revenue: number; orders: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const step = niceStep(Math.max(0, ...days.map((d) => d.revenue)));
  const max = step * TICK_COUNT;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => i * step);
  const hasSales = days.some((d) => d.revenue > 0);
  // Label about 6 days along the axis.
  const labelEvery = Math.max(1, Math.ceil(days.length / 6));
  const active = hover !== null ? days[hover] : null;

  return (
    <section className="rounded-3xl border border-border bg-surface p-5" aria-labelledby="revenue-title">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="revenue-title" className="font-semibold">Revenue by day</h2>
          <p className="text-xs text-muted-foreground">Hover a day for details.</p>
        </div>
        <button
          type="button"
          onClick={() => setAsTable((value) => !value)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
        >
          {asTable ? <BarChart3 size={14} /> : <Table2 size={14} />}
          {asTable ? "Chart" : "Table"}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">Day</th>
                <th className="py-2 text-right font-medium">Orders</th>
                <th className="py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...days].reverse().map((d) => (
                <tr key={d.day}>
                  <td className="py-1.5">{dayLabel(d.day, { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="py-1.5 text-right tabular-nums">{d.orders}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatINR(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          {!hasSales && (
            <p className="absolute inset-x-0 top-16 z-10 text-center text-sm text-muted-foreground">No paid orders in this period yet.</p>
          )}

          <div className="flex gap-2">
            {/* Y axis */}
            <div className="relative h-56 w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
              {ticks.map((tick) => (
                <span key={tick} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(tick / max) * 100}%` }}>
                  {compactINR(tick)}
                </span>
              ))}
            </div>

            {/* Plot */}
            <div className="relative h-56 flex-1" onMouseLeave={() => setHover(null)}>
              {/* Hairline grid */}
              {ticks.map((tick) => (
                <div key={tick} className="absolute inset-x-0 h-px bg-border" style={{ bottom: `${(tick / max) * 100}%` }} />
              ))}

              <div className="absolute inset-0 flex items-end gap-0.5">
                {days.map((d, index) => (
                  <button
                    key={d.day}
                    type="button"
                    onMouseEnter={() => setHover(index)}
                    onFocus={() => setHover(index)}
                    onBlur={() => setHover(null)}
                    aria-label={`${dayLabel(d.day, { day: "numeric", month: "short" })}: ${formatINR(d.revenue)}, ${d.orders} orders`}
                    className="group flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                  >
                    <span
                      className={`block w-full max-w-6 rounded-t-[4px] bg-chart-1 transition-opacity ${
                        hover !== null && hover !== index ? "opacity-50" : ""
                      } group-focus-visible:ring-2 group-focus-visible:ring-ring`}
                      style={{ height: d.revenue > 0 ? `max(2px, ${(d.revenue / max) * 100}%)` : 0 }}
                    />
                  </button>
                ))}
              </div>

              {/* Tooltip: value first, label after */}
              {active && hover !== null && (
                <div
                  className="pointer-events-none absolute top-0 z-20 -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg"
                  style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}
                  role="status"
                >
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatINR(active.revenue)}</p>
                  <p className="text-muted-foreground">
                    {active.orders} order{active.orders === 1 ? "" : "s"} · {dayLabel(active.day, { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* X axis */}
          <div className="ml-14 mt-2 flex gap-0.5 text-[11px] text-muted-foreground">
            {days.map((d, index) => (
              <span key={d.day} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
                {index % labelEvery === 0 ? dayLabel(d.day, { day: "numeric", month: "short" }) : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                     Ranked lists (horizontal bars, one hue)                */
/* -------------------------------------------------------------------------- */

export function BarList({ title, rows, empty }: { title: string; rows: { label: string; value: number; note: string }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <section className="rounded-3xl border border-border bg-surface p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.label} title={`${row.label}: ${formatINR(row.value)} · ${row.note}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{row.label}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatINR(row.value)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-chart-1" style={{ width: `${(row.value / max) * 100}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{row.note}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
