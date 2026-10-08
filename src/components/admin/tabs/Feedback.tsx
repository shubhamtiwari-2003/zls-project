"use client";

import { useMemo, useState } from "react";
import {
  Star,
  Search,
  CheckCircle2,
  EyeOff,
  Trash2,
  MessageSquare,
} from "lucide-react";

type ReviewStatus = "Approved" | "Pending" | "Hidden";

interface Review {
  id: string;
  customer: string;
  product: string;
  rating: number;
  comment: string;
  date: string;
  status: ReviewStatus;
}

const reviews: Review[] = [
  {
    id: "RV-001",
    customer: "Rahul Sharma",
    product: "Batman Legacy",
    rating: 5,
    comment: "Amazing quality! The print and frame exceeded expectations.",
    date: "19 Sep 2026",
    status: "Approved",
  },
  {
    id: "RV-002",
    customer: "Priya Singh",
    product: "Spider Neon",
    rating: 4,
    comment: "Looks beautiful on my wall. Packaging was excellent.",
    date: "18 Sep 2026",
    status: "Pending",
  },
  {
    id: "RV-003",
    customer: "Aman Verma",
    product: "Cyberpunk City",
    rating: 2,
    comment: "Delivery was delayed, but the artwork is good.",
    date: "17 Sep 2026",
    status: "Hidden",
  },
  {
    id: "RV-004",
    customer: "Rohit Patel",
    product: "Ironman Frame",
    rating: 5,
    comment: "Premium finish. Definitely worth the price.",
    date: "16 Sep 2026",
    status: "Approved",
  },
];

export default function Feedbacks() {
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("All");

  const filtered = useMemo(() => {
    return reviews.filter((review) => {
      const matchesSearch =
        review.customer.toLowerCase().includes(search.toLowerCase()) ||
        review.product.toLowerCase().includes(search.toLowerCase());

      const matchesRating =
        ratingFilter === "All" ||
        review.rating === Number(ratingFilter);

      return matchesSearch && matchesRating;
    });
  }, [search, ratingFilter]);

  const avgRating = (
    reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
  ).toFixed(1);

  const pending = reviews.filter((r) => r.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Feedbacks</h1>
        <p className="mt-1 text-muted-foreground">
          Manage customer reviews and ratings.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Average Rating"
          value={avgRating}
          icon={<Star className="text-yellow-500 fill-yellow-500" size={20} />}
        />

        <StatCard
          title="Total Reviews"
          value={reviews.length.toString()}
          icon={<MessageSquare size={20} />}
        />

        <StatCard
          title="Pending Approval"
          value={pending.toString()}
          icon={<CheckCircle2 className="text-orange-500" size={20} />}
        />
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              placeholder="Search customer or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 outline-none"
            />
          </div>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-3"
          >
            <option>All</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-3xl border border-border bg-surface lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-secondary/40 text-left text-sm text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Review</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((review) => (
                <tr
                  key={review.id}
                  className="border-b border-border hover:bg-surface-secondary/30"
                >
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-semibold">{review.customer}</p>
                      <p className="text-xs text-muted-foreground">{review.date}</p>
                    </div>
                  </td>

                  <td className="px-6 py-5">{review.product}</td>

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-zinc-300"
                          }
                        />
                      ))}
                    </div>
                  </td>

                  <td className="max-w-xs px-6 py-5 text-sm text-muted-foreground">
                    {review.comment}
                  </td>

                  <td className="px-6 py-5">
                    <StatusBadge status={review.status} />
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex gap-2">
                      <button className="rounded-lg p-2 hover:bg-success/15 ">
                        <CheckCircle2 size={18} className="text-success" />
                      </button>

                      <button className="rounded-lg p-2 hover:bg-orange-100 dark:hover:bg-orange-900/20">
                        <EyeOff size={18} className="text-orange-500" />
                      </button>

                      <button className="rounded-lg p-2 hover:bg-danger/15 ">
                        <Trash2 size={18} className="text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-4 lg:hidden">
        {filtered.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{review.customer}</h3>
                <p className="text-sm text-muted-foreground">{review.product}</p>
              </div>

              <StatusBadge status={review.status} />
            </div>

            <div className="mt-3 flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i < review.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-zinc-300"
                  }
                />
              ))}
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{review.comment}</p>

            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg p-2 hover:bg-success/15 ">
                <CheckCircle2 size={18} className="text-success" />
              </button>

              <button className="rounded-lg p-2 hover:bg-orange-100 dark:hover:bg-orange-900/20">
                <EyeOff size={18} className="text-orange-500" />
              </button>

              <button className="rounded-lg p-2 hover:bg-danger/15 ">
                <Trash2 size={18} className="text-danger" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        {icon}
      </div>

      <h3 className="mt-4 text-3xl font-bold">{value}</h3>
    </div>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const styles = {
    Approved:
      "bg-success/10 text-success  ",
    Pending:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    Hidden:
      "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}