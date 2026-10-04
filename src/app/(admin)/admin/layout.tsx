import type { ReactNode } from "react";
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

  return <AdminShell>{children}</AdminShell>;
}
