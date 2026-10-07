"use client";

import {
  Boxes,
  ChartColumn,
  CreditCard,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  TicketPercent,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

interface MenuItem {
  label: string;
  tab: string;
  icon: LucideIcon;
}

const MENU: { label: string; items: MenuItem[] }[] = [
  {
    label: "Store",
    items: [
      { label: "Overview", tab: "overview", icon: LayoutDashboard },
      { label: "Orders", tab: "orders", icon: ShoppingCart },
      { label: "Products", tab: "products", icon: Package },
      { label: "Inventory", tab: "inventory", icon: Boxes },
      { label: "Coupons", tab: "coupons", icon: TicketPercent },
      { label: "Feedbacks", tab: "feedbacks", icon: MessageSquare },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Sales", tab: "sales", icon: ChartColumn },
      { label: "Payments", tab: "payments", icon: CreditCard },
      { label: "Refunds", tab: "refunds", icon: Wallet },
      { label: "Invoices", tab: "invoices", icon: Receipt },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", tab: "settings", icon: Settings }],
  },
];

// Active item: black/white like the rest of the admin (shadcn's default is
// a light grey).
const ACTIVE_CLASSES =
  "data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground";

/** Admin navigation. Tabs live in the URL (?tab=orders). */
export function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setOpenMobile } = useSidebar();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const activeTab = searchParams.get("tab") ?? "overview";

  const changeTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/admin?${params.toString()}`, { scroll: false });

    // Phones: close the drawer after picking a tab.
    setOpenMobile(false);
  };

  const name = profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const initial = (name || user?.email || "A").charAt(0).toUpperCase();

  return (
    <SidebarRoot collapsible="icon">
      {/* Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Z Layer Studio" onClick={() => changeTab("overview")}>
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Layers className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-bold">Z Layer Studio</span>
                <span className="truncate text-xs text-muted-foreground">Admin Panel</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        {MENU.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ label, tab, icon: Icon }) => (
                  <SidebarMenuItem key={tab}>
                    <SidebarMenuButton
                      isActive={activeTab === tab}
                      tooltip={label}
                      onClick={() => changeTab(tab)}
                      className={ACTIVE_CLASSES}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Signed-in admin */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={user?.email ?? "Admin"} className="cursor-default hover:bg-transparent">
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
                {initial}
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{name || "Admin"}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
              {profile?.role && (
                <span className="shrink-0 rounded-full bg-sidebar-accent px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {profile.role}
                </span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </SidebarRoot>
  );
}
