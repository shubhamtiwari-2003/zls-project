"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SignOut } from "@supabase/supabase-js";
import {
  Boxes,
  ChartColumn,
  CreditCard,
  LayoutDashboard,
  Layers,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Wallet,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/store/authStore";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
}

const menu = [
  { label: "Overview", tab: "overview", icon: LayoutDashboard },
  { label: "Orders", tab: "orders", icon: ShoppingCart },
  { label: "Products", tab: "products", icon: Package },
  { label: "Inventory", tab: "inventory", icon: Boxes },
  { label: "Sales", tab: "sales", icon: ChartColumn },
  { label: "Feedbacks", tab: "feedbacks", icon: MessageSquare },
  { label: "Payments", tab: "payments", icon: CreditCard },
  { label: "Refunds", tab: "refunds", icon: Wallet },
  { label: "Invoices", tab: "invoices", icon: Receipt },
  { label: "Settings", tab: "settings", icon: Settings },
];

export function Sidebar({
  collapsed,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {user, profile} = useAuthStore();
  
  

  const activeTab = searchParams.get("tab") ?? "overview";
  
  const changeTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);

    router.replace(`/admin?${params.toString()}`, {
      scroll: false,
    });

    setMobileOpen(false);
  };

  const SidebarContent = (
    <>
      {/* Logo */}
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <Layers size={22} />
            </div>
            

            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <h2 className="font-bold leading-none">
                    Z Layer Studio
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Admin Panel
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-5">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.tab;

          return (
            <button
              key={item.tab}
              onClick={() => changeTab(item.tab)}
              className={`flex w-full items-center rounded-xl px-4 py-3 hover:bg-muted/20 cursor-pointer transition ${
                active
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-surface-secondary"
              }`}
            >
              <Icon size={20} className="shrink-0" />

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="ml-3 overflow-hidden whitespace-nowrap text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* Admin Info */}
      <div className="border-t border-border p-4">
        <div
          className={`flex items-center rounded-xl bg-background p-3 ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-background">
            S
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-xs ">
                  {user?.email}
                </p>
                <p className="text-xs text-white">
                  {profile?.role}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
            
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{
          width: collapsed ? 88 : 280,
        }}
        transition={{
          duration: 0.28,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="fixed left-0 top-0 z-40 hidden h-screen overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col"
      >
        {SidebarContent}
      </motion.aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            />

            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 28,
              }}
              className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-border bg-surface lg:hidden"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}