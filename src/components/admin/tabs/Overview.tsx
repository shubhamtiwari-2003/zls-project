"use client";

import {
  ArrowUpRight,
  IndianRupee,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";
import { LowStockPanel } from "@/components/admin/LowStockPanel";
import { RecentOrdersPanel } from "@/components/admin/orders/RecentOrdersPanel";

const stats = [
  {
    title: "Revenue",
    value: "₹84,540",
    growth: "+12.5%",
    icon: IndianRupee,
  },
  {
    title: "Orders",
    value: "126",
    growth: "+18%",
    icon: ShoppingCart,
  },
  {
    title: "Products",
    value: "48",
    growth: "+4",
    icon: Package,
  },
  {
    title: "Customers",
    value: "312",
    growth: "+22",
    icon: Users,
  },
];

export default function Overview() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="mt-1 text-muted">
            Welcome back, Shubham. Here&apos;s your store performance.
          </p>
        </div>

        <button className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-secondary transition">
          Download Report
        </button>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-3xl border border-border bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">{card.title}</p>

                <div className="rounded-xl bg-surface-secondary p-2">
                  <Icon size={18} />
                </div>
              </div>

              <h2 className="mt-5 text-3xl font-bold">{card.value}</h2>

              <div className="mt-3 flex items-center gap-1 text-sm text-green-600">
                <ArrowUpRight size={14} />
                {card.growth}
              </div>
            </div>
          );
        })}
      </section>

      {/* Revenue + Low Stock */}
      <section className="grid lg:grid-cols-[2fr_1fr] gap-6">
        {/* Revenue Chart */}
        <div className="rounded-3xl border border-border bg-surface p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Revenue</h2>
              <p className="text-sm text-muted">Last 7 Days</p>
            </div>

            <h3 className="text-2xl font-bold">₹84,540</h3>
          </div>

          <div className="h-64 w-full">
            <svg
              viewBox="0 0 500 220"
              className="h-full w-full"
              preserveAspectRatio="none"
            >
              {/* Grid */}
              {[0, 1, 2, 3].map((i) => (
                <line
                  key={i}
                  x1="40"
                  y1={30 + i * 45}
                  x2="470"
                  y2={30 + i * 45}
                  stroke="currentColor"
                  opacity="0.08"
                />
              ))}

              {/* Area */}
              <polygon
                fill="#16A34A"
                opacity="0.12"
                points="40,150 110,120 180,135 250,90 320,80 390,95 460,55 460,180 40,180"
              />

              {/* Line */}
              <polyline
                fill="none"
                stroke="#16A34A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="40,150 110,120 180,135 250,90 320,80 390,95 460,55"
              />

              {[
                [40, 150],
                [110, 120],
                [180, 135],
                [250, 90],
                [320, 80],
                [390, 95],
                [460, 55],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="5" fill="#16A34A" />
              ))}
            </svg>
          </div>

          <div className="mt-4 flex justify-between text-xs text-muted px-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <LowStockPanel />
      </section>

      {/* Recent Orders */}
      <RecentOrdersPanel />
    </div>
  );
}