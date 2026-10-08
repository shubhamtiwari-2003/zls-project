import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/customization";
import { getOrIssueInvoice, invoiceFileName, loadInvoiceSettings } from "@/lib/invoices.server";
import { renderInvoicePdf } from "@/lib/invoice-pdf.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The invoice PDF of a paid order. Customers get their own orders' invoices
 * (RLS); admins any.
 *
 * GET /api/invoices/<orderId>            → download
 * GET /api/invoices/<orderId>?view=1     → open in the browser
 */
export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!isUuid(orderId)) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  try {
    const admin = createAdminClient();
    const invoice = await getOrIssueInvoice(supabase, admin, orderId);

    if (!invoice) {
      return NextResponse.json({ error: "No invoice for this order yet. Invoices are issued once payment succeeds." }, { status: 404 });
    }

    const pdf = await renderInvoicePdf(invoice, await loadInvoiceSettings(admin));
    const view = new URL(request.url).searchParams.get("view") === "1";

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${view ? "inline" : "attachment"}; filename="${invoiceFileName(invoice.invoice_number)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Invoice PDF error:", error);
    return NextResponse.json({ error: "Could not create the invoice PDF." }, { status: 500 });
  }
}
