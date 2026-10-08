"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatINR } from "@/lib/shop-config";
import { formatInvoiceDate, paymentMethodLabel } from "@/lib/invoices";

/*
  Payments = checkout attempts (orders) and what Razorpay reported:
    Paid              payment captured
    Awaiting payment  order created, payment window still open
    Not completed     customer left / payment failed; order expired
  Fees are Razorpay's charge (incl. GST on the fee), in paise on the order.
*/

type Filter = "all" | "paid" | "awaiting" | "incomplete";

interface PaymentRow {
  id: string;
  order_number: string;
  placed_at: string;
  paid_at: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
  payment_method: string | null;
  payment_details: { bank?: string | null; wallet?: string | null; vpa?: string | null; card_network?: string | null; card_last4?: string | null } | null;
  payment_fee: number | null;
  razorpay_payment_id: string | null;
  shipping_address: { full_name: string } | { full_name: string }[] | null;
}

const RANGES = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 0, label: "All time" },
] as const;

function statusOf(row: PaymentRow): { key: Exclude<Filter, "all">; label: string; className: string } {
  if (row.payment_status === "paid") return { key: "paid", label: "Paid", className: "bg-success/10 text-success" };
  if (row.status === "canceled") return { key: "incomplete", label: "Not completed", className: "bg-muted text-muted-foreground" };
  return { key: "awaiting", label: "Awaiting payment", className: "bg-warning/10 text-warning" };
}

function methodDetail(row: PaymentRow): string | null {
  const d = row.payment_details;
  if (!d) return null;
  if (d.card_network || d.card_last4) return [d.card_network, d.card_last4 ? `•••• ${d.card_last4}` : null].filter(Boolean).join(" ");
  return d.vpa ?? d.bank ?? d.wallet ?? null;
}

const customerName = (row: PaymentRow) =>
  (Array.isArray(row.shipping_address) ? row.shipping_address[0] : row.shipping_address)?.full_name ?? "—";

export default function Payments() {
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState<number>(30);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    let query = supabase
      .from("orders")
      .select(
        `id, order_number, placed_at, paid_at, status, payment_status, total_amount,
         payment_method, payment_details, payment_fee, razorpay_payment_id,
         shipping_address:addresses!shipping_address_id ( full_name )`
      )
      .order("placed_at", { ascending: false })
      .limit(1000);

    if (range) query = query.gte("placed_at", new Date(Date.now() - range * 86_400_000).toISOString());

    query.then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) {
        setError(loadError.message.includes("payment_") ? "Run the finance migration in Supabase to see payment details." : loadError.message);
        return;
      }
      setError("");
      setRows((data ?? []) as unknown as PaymentRow[]);
    });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const summary = useMemo(() => {
    const paid = (rows ?? []).filter((row) => row.payment_status === "paid");
    const collected = paid.reduce((sum, row) => sum + Number(row.total_amount), 0);
    const fees = paid.reduce((sum, row) => sum + Number(row.payment_fee ?? 0), 0) / 100;
    const attempts = rows?.length ?? 0;

    return {
      collected,
      fees,
      net: collected - fees,
      paidCount: paid.length,
      successRate: attempts ? Math.round((paid.length / attempts) * 100) : 0,
      attempts,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (rows ?? []).filter((row) => {
      if (filter !== "all" && statusOf(row).key !== filter) return false;
      if (!query) return true;
      return [row.order_number, row.razorpay_payment_id, customerName(row)].some((value) =>
        value?.toLowerCase().includes(query)
      );
    });
  }, [rows, filter, search]);

  const cards = [
    { label: "Collected", value: formatINR(summary.collected), hint: `${summary.paidCount} paid orders` },
    { label: "Razorpay fees", value: formatINR(Math.round(summary.fees)), hint: "Incl. GST on fees" },
    { label: "You receive", value: formatINR(Math.round(summary.net)), hint: "Collected minus fees" },
    { label: "Checkout success", value: `${summary.successRate}%`, hint: `${summary.paidCount} of ${summary.attempts} attempts paid` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="mt-1 text-muted-foreground">Every checkout and what Razorpay reported for it.</p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          aria-label="Date range"
        >
          {RANGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-border bg-surface p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{rows ? card.value : "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl bg-muted p-1 text-sm">
          {(
            [
              ["all", "All"],
              ["paid", "Paid"],
              ["awaiting", "Awaiting"],
              ["incomplete", "Not completed"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-lg px-3 py-1.5 font-medium ${filter === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative min-w-60 flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order, payment ID or customer"
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </div>
      </div>

      {!rows ? (
        !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Loading payments…
          </div>
        )
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No payments match.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-right font-medium">Fee</th>
                <th className="px-4 py-3 font-medium">Razorpay ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((row) => {
                const status = statusOf(row);
                const detail = methodDetail(row);

                return (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatInvoiceDate(row.paid_at ?? row.placed_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{row.order_number}</td>
                    <td className="px-4 py-3">{customerName(row)}</td>
                    <td className="px-4 py-3">
                      {row.payment_status === "paid" ? paymentMethodLabel(row.payment_method) : "—"}
                      {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatINR(Number(row.total_amount))}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {row.payment_fee != null ? `₹${(Number(row.payment_fee) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.razorpay_payment_id ? (
                        <a
                          href={`https://dashboard.razorpay.com/app/payments/${row.razorpay_payment_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-info hover:underline"
                        >
                          {row.razorpay_payment_id}
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
