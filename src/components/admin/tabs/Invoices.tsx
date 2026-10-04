"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Download,
  Eye,
  FileText,
  Calendar,
} from "lucide-react";

type InvoiceStatus = "Paid" | "Pending";

interface Invoice {
  id: string;
  orderId: string;
  customer: string;
  amount: number;
  date: string;
  status: InvoiceStatus;
}

const invoices: Invoice[] = [
  {
    id: "INV-1001",
    orderId: "ORD-1001",
    customer: "Rahul Sharma",
    amount: 2499,
    date: "19 Sep 2026",
    status: "Paid",
  },
  {
    id: "INV-1002",
    orderId: "ORD-1002",
    customer: "Priya Singh",
    amount: 649,
    date: "19 Sep 2026",
    status: "Pending",
  },
  {
    id: "INV-1003",
    orderId: "ORD-1003",
    customer: "Aman Verma",
    amount: 2199,
    date: "18 Sep 2026",
    status: "Paid",
  },
  {
    id: "INV-1004",
    orderId: "ORD-1004",
    customer: "Rohit Patel",
    amount: 999,
    date: "18 Sep 2026",
    status: "Paid",
  },
];

export default function Invoices() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return invoices.filter((invoice) => {
      const q = search.toLowerCase();

      return (
        invoice.id.toLowerCase().includes(q) ||
        invoice.customer.toLowerCase().includes(q) ||
        invoice.orderId.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const total = invoices.reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="mt-1 text-muted">
            View and download customer invoices.
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 hover:bg-surface-secondary">
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Summary */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Total Invoices</p>
            <FileText size={18} />
          </div>

          <h3 className="mt-4 text-3xl font-bold">
            {invoices.length}
          </h3>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Revenue</p>
            ₹
          </div>

          <h3 className="mt-4 text-3xl font-bold">
            ₹{total.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">This Month</p>
            <Calendar size={18} />
          </div>

          <h3 className="mt-4 text-3xl font-bold">24</h3>
        </div>
      </section>

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />

        <input
          placeholder="Search invoice, order or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-border bg-surface py-3 pl-10 pr-4 outline-none"
        />
      </div>

      {/* Invoice Table */}
      <section className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px]">
            <thead className="border-b border-border bg-surface-secondary/40 text-left text-sm text-muted">
              <tr>
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-border hover:bg-surface-secondary/30"
                >
                  <td className="px-6 py-5 font-semibold">
                    {invoice.id}
                  </td>

                  <td className="px-6 py-5">
                    #{invoice.orderId}
                  </td>

                  <td className="px-6 py-5">
                    {invoice.customer}
                  </td>

                  <td className="px-6 py-5 font-semibold">
                    ₹{invoice.amount.toLocaleString()}
                  </td>

                  <td className="px-6 py-5">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        invoice.status === "Paid"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-muted">
                    {invoice.date}
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-lg p-2 hover:bg-surface-secondary">
                        <Eye size={18} />
                      </button>

                      <button className="rounded-lg p-2 hover:bg-surface-secondary">
                        <Download size={18} />
                      </button>
                    </div>
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