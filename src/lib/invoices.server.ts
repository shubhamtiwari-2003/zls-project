import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_INVOICE_SETTINGS,
  INVOICE_SETTINGS_SELECT,
  type InvoiceRecord,
  type InvoiceSettings,
} from "@/lib/invoices";

export const INVOICE_SELECT = "id, order_id, invoice_number, issued_at, total_amount, data";

/** The invoice template. `admin` = service-role client (customers can't read it). */
export async function loadInvoiceSettings(admin: SupabaseClient): Promise<InvoiceSettings> {
  const { data, error } = await admin.from("invoice_settings").select(INVOICE_SETTINGS_SELECT).eq("id", true).maybeSingle();

  if (error) console.error("Invoice settings error:", error);
  return { ...DEFAULT_INVOICE_SETTINGS, ...((data as Partial<InvoiceSettings> | null) ?? {}) };
}

/**
 * The invoice of an order, issuing it first if the order is paid but has
 * none yet (e.g. issued automatically failed). `client` decides access:
 * the customer's own client only sees their own orders (RLS).
 */
export async function getOrIssueInvoice(
  client: SupabaseClient,
  admin: SupabaseClient,
  orderId: string
): Promise<InvoiceRecord | null> {
  const { data: existing } = await client.from("invoices").select(INVOICE_SELECT).eq("order_id", orderId).maybeSingle();
  if (existing) return existing as InvoiceRecord;

  // Only for orders this client can see and that are paid.
  const { data: order } = await client.from("orders").select("id, payment_status").eq("id", orderId).maybeSingle();
  if (!order || order.payment_status !== "paid") return null;

  const { data: issued, error } = await admin.rpc("issue_invoice", { p_order_id: orderId });
  if (error) {
    console.error("Issue invoice error:", error);
    return null;
  }

  const row = Array.isArray(issued) ? issued[0] : issued;
  return row ? (row as InvoiceRecord) : null;
}

/** "ZFS-2026-27-0001.pdf" */
export const invoiceFileName = (invoiceNumber: string) => `${invoiceNumber.replace(/[^A-Za-z0-9-]+/g, "-")}.pdf`;
