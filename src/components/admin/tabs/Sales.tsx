"use client";

import {
  IndianRupee,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

const revenueData = [22, 35, 28, 42, 38, 55, 48];

const transactions = [
  {
    id: "#INV-1001",
    customer: "Rahul Sharma",
    date: "19 Sep 2026",
    amount: 2499,
    method: "Razorpay",
    status: "Paid",
  },
  {
    id: "#INV-1002",
    customer: "Priya Singh",
    date: "19 Sep 2026",
    amount: 649,
    method: "COD",
    status: "Pending",
  },
  {
    id: "#INV-1003",
    customer: "Aman Verma",
    date: "18 Sep 2026",
    amount: 2199,
    method: "Razorpay",
    status: "Paid",
  },
  {
    id: "#INV-1004",
    customer: "Rohit Patel",
    date: "18 Sep 2026",
    amount: 999,
    method: "UPI",
    status: "Refunded",
  },
];

export default function Sales() {
  const max = Math.max(...revenueData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-muted mt-1">
            Revenue, transactions and payment overview.
          </p>
        </div>

        <button className="rounded-xl border border-border bg-surface px-4 py-2 font-medium hover:bg-surface-secondary transition">
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Total Revenue",
            value: "₹1,84,540",
            icon: IndianRupee,
            growth: "+18%",
          },
          {
            title: "Orders",
            value: "326",
            icon: ShoppingCart,
            growth: "+12%",
          },
          {
            title: "Payments",
            value: "₹1,62,900",
            icon: CreditCard,
            growth: "+9%",
          },
          {
            title: "Growth",
            value: "24.8%",
            icon: TrendingUp,
            growth: "This Month",
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-3xl border border-border bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">{card.title}</p>
                <Icon size={18} />
              </div>

              <h3 className="mt-4 text-3xl font-bold">{card.value}</h3>

              <div className="mt-3 flex items-center gap-1 text-sm text-green-600">
                <ArrowUpRight size={14} />
                {card.growth}
              </div>
            </div>
          );
        })}
      </section>

      {/* Revenue Chart */}
      <section className="rounded-3xl border border-border bg-surface p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Weekly Revenue</h2>
          <p className="text-sm text-muted">Last 7 days performance</p>
        </div>

        <div className="flex h-64 items-end justify-between gap-3">
          {revenueData.map((value, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-xl bg-[#003D29] transition-all hover:opacity-80"
                style={{
                  height: `${(value / max) * 180}px`,
                }}
              />

              <span className="text-xs text-muted">
                {["M", "T", "W", "T", "F", "S", "S"][index]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Transactions */}
      <section className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="border-b border-border p-6">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-surface-secondary/40 text-left text-sm text-muted">
              <tr>
                <th className="px-6 py-4 font-medium">Invoice</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Method</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-t border-border hover:bg-surface-secondary/30"
                >
                  <td className="px-6 py-5 font-semibold">{tx.id}</td>
                  <td className="px-6 py-5">{tx.customer}</td>
                  <td className="px-6 py-5 text-muted">{tx.date}</td>
                  <td className="px-6 py-5">{tx.method}</td>
                  <td className="px-6 py-5 font-semibold">
                    ₹{tx.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        tx.status === "Paid"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : tx.status === "Pending"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}