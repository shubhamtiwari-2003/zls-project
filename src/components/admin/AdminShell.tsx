"use client";

import type { CSSProperties, ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";

interface AdminShellProps {
  children: ReactNode;
  // From the sidebar_state cookie (see admin/layout.tsx).
  defaultSidebarOpen: boolean;
}

/*
  Admin layout on shadcn's Sidebar: SidebarProvider holds the open /
  collapsed state (Ctrl/Cmd+B toggles it, a cookie remembers it), and on
  phones the sidebar becomes a slide-in drawer.
*/
export function AdminShell({ children, defaultSidebarOpen }: AdminShellProps) {
  return (
    <SidebarProvider
      defaultOpen={defaultSidebarOpen}
      style={{ "--sidebar-width": "17.5rem" } as CSSProperties}
    >
      <Sidebar />

      <SidebarInset className="min-w-0 bg-background">
        <Topbar />
        <main className="p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
