"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, Loader2, Palette, RefreshCw, Save, Search, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatINR } from "@/lib/shop-config";
import {
  DEFAULT_INVOICE_SETTINGS,
  INVOICE_SETTINGS_SELECT,
  formatInvoiceDate,
  parseInvoiceSettings,
  type InvoiceData,
  type InvoiceSettings,
} from "@/lib/invoices";

type View = "issued" | "template";

interface InvoiceRow {
  id: string;
  order_id: string;
  invoice_number: string;
  issued_at: string;
  total_amount: number;
  data: Pick<InvoiceData, "buyer" | "order">;
}

export default function Invoices() {
  const [view, setView] = useState<View>("issued");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="mt-1 text-muted-foreground">
            Issued automatically when an order is paid. Customers download theirs from their order page.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-muted p-1" role="tablist">
          {(
            [
              { value: "issued", label: "Issued invoices", Icon: FileText },
              { value: "template", label: "Template", Icon: Palette },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                view === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      {view === "issued" ? <IssuedInvoices /> : <TemplateEditor />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Issued invoices                              */
/* -------------------------------------------------------------------------- */

function IssuedInvoices() {
  const [rows, setRows] = useState<InvoiceRow[] | null>(null);
  const [missing, setMissing] = useState(0);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data, error: loadError }, { data: paid }] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, order_id, invoice_number, issued_at, total_amount, data->buyer, data->order")
        .order("issued_at", { ascending: false })
        .limit(500),
      supabase.from("orders").select("id").eq("payment_status", "paid"),
    ]);

    if (loadError) {
      setError(loadError.message.includes("invoices") ? "Invoices table not found. Run the finance migration in Supabase." : loadError.message);
      return;
    }

    const invoices = ((data ?? []) as unknown as (Omit<InvoiceRow, "data"> & InvoiceRow["data"])[]).map((row) => ({
      ...row,
      data: { buyer: row.buyer, order: row.order },
    }));

    const invoiced = new Set(invoices.map((row) => row.order_id));
    setRows(invoices);
    setMissing((paid ?? []).filter((order) => !invoiced.has(order.id)).length);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const issueMissing = async () => {
    setIssuing(true);
    setNotice(null);
    const { data, error: rpcError } = await supabase.rpc("issue_missing_invoices");
    setIssuing(false);

    if (rpcError) setNotice(rpcError.message);
    else {
      setNotice(`Issued ${data} invoice${data === 1 ? "" : "s"}.`);
      load();
    }
  };

  if (error) return <p className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">{error}</p>;
  if (!rows) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading invoices…
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const visible = query
    ? rows.filter((row) =>
        [row.invoice_number, row.data.order?.number, row.data.buyer?.name, row.data.buyer?.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      )
    : rows;

  return (
    <div className="space-y-4">
      {missing > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <span>
            <strong>{missing}</strong> paid order{missing === 1 ? " has" : "s have"} no invoice yet (e.g. paid before
            invoices existed). Fill in the template first, then issue them.
          </span>
          <button
            type="button"
            onClick={issueMissing}
            disabled={issuing}
            className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 font-medium text-background disabled:opacity-60"
          >
            {issuing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Issue missing invoices
          </button>
        </div>
      )}

      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice, order or customer"
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? "No invoices yet. They're issued when orders are paid." : "No invoices match your search."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{row.invoice_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatInvoiceDate(row.issued_at)}</td>
                  <td className="px-4 py-3">{row.data.order?.number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="block">{row.data.buyer?.name ?? "—"}</span>
                    {row.data.buyer?.email && <span className="text-xs text-muted-foreground">{row.data.buyer.email}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatINR(Number(row.total_amount))}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <a
                        href={`/api/invoices/${row.order_id}?view=1`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View ${row.invoice_number}`}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Eye size={16} />
                      </a>
                      <a
                        href={`/api/invoices/${row.order_id}`}
                        aria-label={`Download ${row.invoice_number}`}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Download size={16} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Template editor                              */
/* -------------------------------------------------------------------------- */

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10";
const labelClass = "block text-sm font-medium";
const hintClass = "mt-1 text-xs text-muted-foreground";

function TemplateEditor() {
  const [draft, setDraft] = useState<InvoiceSettings | null>(null);
  const [saved, setSaved] = useState<InvoiceSettings | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Live preview: a PDF of the unsaved template, refreshed after typing stops.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    supabase
      .from("invoice_settings")
      .select(INVOICE_SETTINGS_SELECT)
      .eq("id", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setLoadError(error?.message ?? "Invoice settings not found. Run the finance migration in Supabase.");
          return;
        }
        const settings = { ...DEFAULT_INVOICE_SETTINGS, ...(data as InvoiceSettings) };
        setDraft(settings);
        setSaved(settings);
      });
  }, []);

  const draftKey = draft ? JSON.stringify(draft) : "";

  useEffect(() => {
    if (!draftKey) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const response = await fetch("/api/admin/invoices/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: JSON.parse(draftKey) }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setPreviewError(data?.error ?? "Could not draw the preview.");
          return;
        }

        const url = URL.createObjectURL(await response.blob());
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        setPreviewError(null);
      } catch {
        if (!controller.signal.aborted) setPreviewError("Could not draw the preview.");
      } finally {
        if (!controller.signal.aborted) setPreviewing(false);
      }
    }, 700);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [draftKey]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  if (loadError) return <p className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">{loadError}</p>;
  if (!draft || !saved) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading template…
      </div>
    );
  }

  const set = <K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) => {
    setDraft({ ...draft, [key]: value });
    setMessage(null);
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = async () => {
    const { settings, error } = parseInvoiceSettings(draft);
    if (!settings) {
      setMessage({ type: "error", text: error ?? "Check the form." });
      return;
    }

    setSaving(true);
    const { data, error: saveError } = await supabase.from("invoice_settings").update(settings).eq("id", true).select("id");
    setSaving(false);

    if (saveError || !data?.length) {
      setMessage({ type: "error", text: saveError?.message ?? "Could not save. Are you signed in as an admin?" });
      return;
    }

    setDraft(settings);
    setSaved(settings);
    setMessage({ type: "success", text: "Template saved." });
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      setMessage({ type: "error", text: "Use a PNG or JPG logo (PDFs can't show SVG or WebP)." });
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch("/api/cloudinary/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? "Upload failed.");
      set("logo_url", result.url);
    } catch (uploadError) {
      setMessage({ type: "error", text: uploadError instanceof Error ? uploadError.message : "Upload failed." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] [&>*]:min-w-0">
      {/* Form */}
      <div className="space-y-6">
        <section className="space-y-4 rounded-3xl border border-border bg-surface p-5">
          <div>
            <h2 className="font-semibold">Business details</h2>
            <p className={hintClass}>
              Printed in &quot;Sold by&quot;. Copied onto each invoice when it&apos;s issued: changes apply to new
              invoices, never to ones already issued.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="inv-name">Business name</label>
              <input id="inv-name" value={draft.seller_name} onChange={(e) => set("seller_name", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="inv-legal">Owner / legal name</label>
              <input id="inv-legal" value={draft.seller_legal_name} onChange={(e) => set("seller_legal_name", e.target.value)} className={inputClass} placeholder="Shown as “Operated by …”" />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="inv-address">Address</label>
            <textarea id="inv-address" rows={2} value={draft.seller_address} onChange={(e) => set("seller_address", e.target.value)} className={inputClass} placeholder="House, street, area, city, PIN, state" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="inv-email">Email</label>
              <input id="inv-email" type="email" value={draft.seller_email} onChange={(e) => set("seller_email", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="inv-phone">Phone</label>
              <input id="inv-phone" value={draft.seller_phone} onChange={(e) => set("seller_phone", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="inv-gstin">GSTIN <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input id="inv-gstin" value={draft.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15))} className={`${inputClass} font-mono`} placeholder="Leave empty if not registered" />
              <p className={hintClass}>
                {draft.gstin ? "Title becomes “Tax Invoice” with your GSTIN." : "Empty: title “Invoice”, marked “Not registered under GST”."}
              </p>
            </div>
            <div>
              <label className={labelClass} htmlFor="inv-prefix">Invoice number prefix</label>
              <input id="inv-prefix" value={draft.invoice_prefix} onChange={(e) => set("invoice_prefix", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10))} className={`${inputClass} font-mono`} />
              <p className={hintClass}>Numbers look like {draft.invoice_prefix || "ZFS"}/2026-27/0001 (new each financial year).</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-surface p-5">
          <div>
            <h2 className="font-semibold">Look &amp; text</h2>
            <p className={hintClass}>Applies to every invoice, including ones already issued.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="inv-color">Accent colour</label>
              <div className="mt-1.5 flex items-center gap-2">
                <input id="inv-color" type="color" value={/^#[0-9A-Fa-f]{6}$/.test(draft.accent_color) ? draft.accent_color : "#000000"} onChange={(e) => set("accent_color", e.target.value.toUpperCase())} className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-background" />
                <input value={draft.accent_color} onChange={(e) => set("accent_color", e.target.value.trim().slice(0, 7))} className={`${inputClass} mt-0 font-mono`} aria-label="Accent colour code" />
              </div>
            </div>

            <div>
              <span className={labelClass}>Logo <span className="font-normal text-muted-foreground">(PNG or JPG)</span></span>
              <div className="mt-1.5 flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-muted">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {draft.logo_url ? "Replace" : "Upload"}
                  <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => { uploadLogo(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                {draft.logo_url && (
                  <button type="button" onClick={() => set("logo_url", null)} className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-danger">
                    Remove
                  </button>
                )}
              </div>
              <p className={hintClass}>{draft.logo_url ? "Replaces the business name at the top." : "Without a logo, the business name is shown."}</p>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="inv-terms">Terms</label>
            <textarea id="inv-terms" rows={3} value={draft.terms} onChange={(e) => set("terms", e.target.value)} className={inputClass} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="inv-footer">Thank-you line</label>
              <input id="inv-footer" value={draft.footer_note} onChange={(e) => set("footer_note", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="inv-sign">Signature label</label>
              <input id="inv-sign" value={draft.signature_label} onChange={(e) => set("signature_label", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.show_sku} onChange={(e) => set("show_sku", e.target.checked)} className="accent-brand" />
              Show SKUs
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.show_customization} onChange={(e) => set("show_customization", e.target.checked)} className="accent-brand" />
              Show personalisation (e.g. Name: ANNA)
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {message && (
            <p className={`mr-auto text-sm ${message.type === "success" ? "text-success" : "text-danger"}`}>{message.text}</p>
          )}
          <button type="button" onClick={() => { setDraft(saved); setMessage(null); }} disabled={!dirty || saving} className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium disabled:opacity-40">
            Discard
          </button>
          <button type="button" onClick={save} disabled={!dirty || saving} className="flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-40">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save template
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="xl:sticky xl:top-24 xl:self-start">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Preview</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {previewing && <Loader2 size={12} className="animate-spin" />}
            Latest invoice (or a sample) with your unsaved changes
          </span>
        </div>
        {previewError ? (
          <p className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">{previewError}</p>
        ) : previewUrl ? (
          <iframe title="Invoice preview" src={`${previewUrl}#toolbar=0&view=FitH`} className="h-[80vh] w-full rounded-2xl border border-border bg-white" />
        ) : (
          <div className="flex h-[60vh] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            <Loader2 size={16} className="mr-2 animate-spin" /> Drawing preview…
          </div>
        )}
      </div>
    </div>
  );
}
