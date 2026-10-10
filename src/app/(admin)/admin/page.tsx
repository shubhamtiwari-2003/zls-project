"use client";

import { useSearchParams } from "next/navigation";
import Overview from "@/components/admin/tabs/Overview"
import Products from "@/components/admin/tabs/Products";
import Inventory from "@/components/admin/tabs/Inventory";
import Categories from "@/components/admin/tabs/Categories";
import Coupons from "@/components/admin/tabs/Coupons";
import Promotions from "@/components/admin/tabs/Promotions";
import Orders from "@/components/admin/tabs/Orders";
import Sales from "@/components/admin/tabs/Sales";
import Payments from "@/components/admin/tabs/Payments";
import Invoices from "@/components/admin/tabs/Invoices";
import Feedbacks from "@/components/admin/tabs/Feedback";
import Settings from "@/components/admin/tabs/Settings";

export default function AdminPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "overview";

  switch (tab) {
    case "orders":
      return <Orders/>;

    case "products":
      return <Products/>;

    case "categories":
      return <Categories />;

    case "inventory":
      return <Inventory/>;

    case "coupons":
      return <Coupons />;

    case "promotions":
      return <Promotions />;

    case "sales":
      return <Sales/>;

    case "feedbacks":
      return <Feedbacks/>;

    case "payments":
      return <Payments/>;

    case "refunds":
      return <div className="text-6xl text-center w-full h-full uppercase font-bold
        ">Refunds Page will be coming soon </div>;

    case "invoices":
      return <Invoices/>;

    case "settings":
      return <Settings/>;

    default:
      return <Overview/>;
  }
}