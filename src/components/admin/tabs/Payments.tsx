"use client";

import {
  CreditCard,
  Wallet,
  Clock3,
  CheckCircle2,
  Search,
  Download,
} from "lucide-react";
import { useMemo, useState } from "react";

type PaymentStatus = "Paid" | "Pending" | "Failed";

interface Payment {
  id: string;
  orderId: string;
  customer: string;
  method: "Razorpay" | "UPI" | "Card" | "COD";
  amount: number;
  status: PaymentStatus;
  date: string;
}

const payments: Payment[] = [
  {
    id: "PAY_93821",
    orderId: "#ORD-1001",
    customer: "Rahul Sharma",
    method: "Razorpay",
    amount: 2499,
    status: "Paid",
    date: "19 Sep 2026",
  },
  {
    id: "PAY_93822",
    orderId: "#ORD-1002",
    customer: "Priya Singh",
    method: "UPI",
    amount: 649,
    status: "Pending",
    date: "19 Sep 2026",
  },
  {
    id: "PAY_93823",
    orderId: "#ORD-1003",
    customer: "Aman Verma",
    method: "Card",
    amount: 2199,
    status: "Paid",
    date: "18 Sep 2026",
  },
  {
    id: "PAY_93824",
    orderId: "#ORD-1004",
    customer: "Rohit Patel",
    method: "Razorpay",
    amount: 999,
    status: "Failed",
    date: "18 Sep 2026",
  },
];

export default function Payments() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase();

      return (
        p.customer.toLowerCase().includes(q) ||
        p.orderId.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const totalReceived = payments
    .filter((p) => p.status === "Paid")
    .reduce((a, b) => a + b.amount, 0);

  const pending = payments
    .filter((p) => p.status === "Pending")
    .reduce((a, b) => a + b.amount, 0);

  const failed = payments.filter((p) => p.status === "Failed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="mt-1 text-muted-foreground">
            Monitor customer transactions and settlements.
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 hover:bg-surface-secondary">
          <Download size={16} />
          Export
        </button>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Wallet size={18} />}
          title="Received"
          value={`₹${totalReceived.toLocaleString()}`}
          color="text-green-600"
        />

        <StatCard
          icon={<Clock3 size={18} />}
          title="Pending"
          value={`₹${pending.toLocaleString()}`}
          color="text-orange-500"
        />

        <StatCard
          icon={<CreditCard size={18} />}
          title="Transactions"
          value={payments.length.toString()}
          color="text-blue-600"
        />

        <StatCard
          icon={<CheckCircle2 size={18} />}
          title="Failed"
          value={failed.toString()}
          color="text-red-500"
        />
      </section>

      {/* Settlement Card */}
      <section className="rounded-3xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Razorpay Settlement
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Amount to be settled to your bank account
            </p>
          </div>

          <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Next Settlement
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Settlement Amount</p>
            <h3 className="text-4xl font-black">₹18,740</h3>
          </div>

          <div className="text-right">
            <p className="text-sm text-muted-foreground">Expected Date</p>
            <p className="text-lg font-semibold">20 Sep 2026</p>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={18}
        />

        <input
          placeholder="Search payment, customer or order..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-border bg-surface py-3 pl-10 pr-4 outline-none"
        />
      </div>

      {/* Payment Table */}
      <section className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-border bg-surface-secondary/40 text-left text-sm text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Payment ID</th>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-border hover:bg-surface-secondary/30"
                >
                  <td className="px-6 py-5 font-medium">{payment.id}</td>
                  <td className="px-6 py-5">{payment.orderId}</td>
                  <td className="px-6 py-5">{payment.customer}</td>
                  <td className="px-6 py-5">{payment.method}</td>
                  <td className="px-6 py-5 font-semibold">
                    ₹{payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="px-6 py-5 text-muted-foreground">{payment.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className={color}>{icon}</div>
      </div>

      <h3 className="mt-4 text-3xl font-bold">{value}</h3>
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const styles = {
    Paid:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Pending:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    Failed:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}