// Invoice types and helpers shared by the PDF, the admin Invoices tab and
// the customer order page. See supabase/migrations/20261001130000_finance.sql.
//
// Amounts are whole rupees, like orders.

// invoice_settings row: the template edited in Admin → Invoices.
export interface InvoiceSettings {
  seller_name: string;
  seller_legal_name: string;
  seller_address: string;
  seller_email: string;
  seller_phone: string;
  // '' = not GST-registered.
  gstin: string;
  invoice_prefix: string;
  accent_color: string;
  logo_url: string | null;
  footer_note: string;
  terms: string;
  signature_label: string;
  show_sku: boolean;
  show_customization: boolean;
}

export const INVOICE_SETTINGS_SELECT =
  "seller_name, seller_legal_name, seller_address, seller_email, seller_phone, gstin, invoice_prefix, accent_color, logo_url, footer_note, terms, signature_label, show_sku, show_customization";

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  seller_name: "Z Factor Studio",
  seller_legal_name: "",
  seller_address: "",
  seller_email: "",
  seller_phone: "",
  gstin: "",
  invoice_prefix: "ZFS",
  accent_color: "#0440AF",
  logo_url: null,
  footer_note: "Thank you for shopping with us!",
  terms: "",
  signature_label: "Authorised signatory",
  show_sku: true,
  show_customization: true,
};

// invoices.data: frozen when the invoice is issued.
export interface InvoiceData {
  title: string;
  seller: {
    name: string;
    legal_name: string;
    address: string;
    email: string;
    phone: string;
    gstin: string | null;
  };
  buyer: {
    name: string | null;
    phone: string | null;
    email: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  };
  order: { number: string; placed_at: string | null; paid_at: string | null };
  items: {
    name: string | null;
    variant: string | null;
    sku: string | null;
    quantity: number;
    unit_price: number;
    total: number;
    customization: { label: string; value: string }[];
  }[];
  totals: { subtotal: number; discount: number; coupon_code: string | null; shipping: number; total: number };
  payment: { method: string | null; reference: string | null };
}

export interface InvoiceRecord {
  id: string;
  order_id: string;
  invoice_number: string;
  issued_at: string;
  total_amount: number;
  data: InvoiceData;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
  paylater: "Pay later",
  cardless_emi: "Cardless EMI",
};

export const paymentMethodLabel = (method: string | null | undefined) =>
  method ? PAYMENT_METHOD_LABELS[method] ?? method.charAt(0).toUpperCase() + method.slice(1) : "Online payment";

export const formatInvoiceDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    : "—";

/** "₹1,099.00" — invoices show paise even though prices are whole rupees. */
export const formatInvoiceAmount = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* -------------------------------------------------------------------------- */
/*                Amount in words (Indian system: lakh, crore)                */
/* -------------------------------------------------------------------------- */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`;
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

/** 1099 → "Rupees One Thousand Ninety-Nine Only" */
export function amountInWords(amount: number): string {
  let n = Math.floor(Math.abs(amount));
  if (n === 0) return "Rupees Zero Only";

  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;

  if (crore) parts.push(`${crore >= 100 ? belowThousand(crore) : belowHundred(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));

  return `Rupees ${parts.join(" ")} Only`;
}

/** Sample invoice for the template preview (before any real order exists). */
export const SAMPLE_INVOICE: InvoiceRecord = {
  id: "sample",
  order_id: "sample",
  invoice_number: "ZFS/2026-27/0001",
  issued_at: new Date().toISOString(),
  total_amount: 1497,
  data: {
    title: "Invoice",
    seller: { name: "", legal_name: "", address: "", email: "", phone: "", gstin: null },
    buyer: {
      name: "Ananya Sharma",
      phone: "+91 98765 43210",
      email: "ananya@example.com",
      line1: "Flat 12B, Lake View Apartments",
      line2: "Koregaon Park",
      city: "Pune",
      state: "Maharashtra",
      postal_code: "411001",
      country: "India",
    },
    order: { number: "ZLS-261008-A1B2C3", placed_at: new Date().toISOString(), paid_at: new Date().toISOString() },
    items: [
      { name: "Shoji Lamp", variant: "Large · White", sku: "ZFS-1002", quantity: 1, unit_price: 699, total: 699, customization: [] },
      {
        name: "Name Clicker",
        variant: null,
        sku: "ZFS-1005",
        quantity: 2,
        unit_price: 299,
        total: 598,
        customization: [{ label: "Name", value: "ANNA" }],
      },
      { name: "GTA Lightbox", variant: null, sku: "ZFS-1003", quantity: 1, unit_price: 300, total: 300, customization: [] },
    ],
    totals: { subtotal: 1597, discount: 100, coupon_code: "WELCOME100", shipping: 0, total: 1497 },
    payment: { method: "upi", reference: "pay_SAMPLE123456" },
  },
};

/* -------------------------------------------------------------------------- */
/*                         Template input (admin form)                        */
/* -------------------------------------------------------------------------- */

const LIMITS = {
  seller_name: 100,
  seller_legal_name: 100,
  seller_address: 400,
  seller_email: 120,
  seller_phone: 30,
  footer_note: 300,
  terms: 1000,
  signature_label: 60,
} as const;

/** Cleans template values from a form; null = something is invalid. */
export function parseInvoiceSettings(input: unknown): { settings: InvoiceSettings | null; error: string | null } {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const text = (key: keyof typeof LIMITS) => (typeof raw[key] === "string" ? (raw[key] as string).trim().slice(0, LIMITS[key]) : "");

  const gstin = typeof raw.gstin === "string" ? raw.gstin.trim().toUpperCase() : "";
  const prefix = typeof raw.invoice_prefix === "string" ? raw.invoice_prefix.trim().toUpperCase() : "";
  const accent = typeof raw.accent_color === "string" ? raw.accent_color.trim() : "";
  const logo = typeof raw.logo_url === "string" && raw.logo_url.trim() ? raw.logo_url.trim().slice(0, 500) : null;

  const settings: InvoiceSettings = {
    seller_name: text("seller_name"),
    seller_legal_name: text("seller_legal_name"),
    seller_address: text("seller_address"),
    seller_email: text("seller_email"),
    seller_phone: text("seller_phone"),
    gstin,
    invoice_prefix: prefix,
    accent_color: accent,
    logo_url: logo,
    footer_note: text("footer_note"),
    terms: text("terms"),
    signature_label: text("signature_label") || "Authorised signatory",
    show_sku: raw.show_sku !== false,
    show_customization: raw.show_customization !== false,
  };

  if (!settings.seller_name) return { settings: null, error: "Enter the business name." };
  if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) return { settings: null, error: "A GSTIN has 15 letters and numbers (or leave it empty)." };
  if (!/^[A-Z0-9-]{1,10}$/.test(prefix)) return { settings: null, error: "Invoice prefix: 1–10 capital letters, numbers or -." };
  if (!/^#[0-9A-Fa-f]{6}$/.test(accent)) return { settings: null, error: "Pick a colour like #0440AF." };
  if (logo && !/^https:\/\//.test(logo)) return { settings: null, error: "The logo link must start with https://." };

  return { settings, error: null };
}
