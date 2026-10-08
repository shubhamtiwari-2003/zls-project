import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SAMPLE_INVOICE, parseInvoiceSettings, type InvoiceRecord } from "@/lib/invoices";
import { INVOICE_SELECT } from "@/lib/invoices.server";
import { renderInvoicePdf } from "@/lib/invoice-pdf.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live preview for the template editor: the unsaved template drawn on the
 * latest real invoice (or a sample), with the seller block from the form.
 *
 * POST { settings } → PDF (inline)
 */
export async function POST(request: Request) {
  if (!(await getAdmin())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: { settings?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { settings, error } = parseInvoiceSettings(body.settings);
  if (!settings) return NextResponse.json({ error }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data: latest } = await admin
      .from("invoices")
      .select(INVOICE_SELECT)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const base = (latest as InvoiceRecord | null) ?? SAMPLE_INVOICE;

    // The seller block and title as new invoices will have them.
    const invoice: InvoiceRecord = {
      ...base,
      data: {
        ...base.data,
        title: settings.gstin ? "Tax Invoice" : "Invoice",
        seller: {
          name: settings.seller_name,
          legal_name: settings.seller_legal_name,
          address: settings.seller_address,
          email: settings.seller_email,
          phone: settings.seller_phone,
          gstin: settings.gstin || null,
        },
      },
    };

    const pdf = await renderInvoicePdf(invoice, settings);

    return new NextResponse(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="invoice-preview.pdf"', "Cache-Control": "no-store" },
    });
  } catch (renderError) {
    console.error("Invoice preview error:", renderError);
    // Admins only: show the real reason, so problems on the host can be fixed.
    const reason = renderError instanceof Error ? renderError.message : String(renderError);
    const hint = /supabaseKey is required/i.test(reason)
      ? "SUPABASE_SERVICE_ROLE_KEY is not set in the server's environment variables."
      : reason;
    return NextResponse.json({ error: `Could not draw the preview: ${hint}` }, { status: 500 });
  }
}
