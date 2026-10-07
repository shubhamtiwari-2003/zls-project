"use client";

import { useRouter, useSearchParams } from "next/navigation";

export const ADMIN_TABS = [
  "overview",
  "orders",
  "products",
  "inventory",
  "coupons",
  "sales",
  "feedbacks",
  "payments",
  "refunds",
  "invoices",
  "settings",
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number];

export function useAdminTab() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab =
    (searchParams.get("tab") as AdminTab) || "overview";

  const setTab = (nextTab: AdminTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);

    router.replace(`/admin?${params.toString()}`, {
      scroll: false,
    });
  };

  return { tab, setTab };
}