import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Runs on the server for every /admin request.
  // Non-admins are redirected before any admin UI is sent.
  await requireAdmin();

  // Sidebar open/collapsed, saved by the sidebar in a cookie, so it renders
  // in the right state without a flash. Collapsed (icons only) until the
  // admin opens it.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value === "true";

  return <AdminShell defaultSidebarOpen={sidebarOpen}>{children}</AdminShell>;
}
