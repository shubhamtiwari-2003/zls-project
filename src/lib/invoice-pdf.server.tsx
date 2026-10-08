import "server-only";

import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import {
  amountInWords,
  formatInvoiceAmount,
  formatInvoiceDate,
  paymentMethodLabel,
  type InvoiceRecord,
  type InvoiceSettings,
} from "@/lib/invoices";

/*
  Invoice PDF (A4), drawn with @react-pdf/renderer — pure JavaScript, no
  browser or native binaries, so it also runs on Hostinger.

  Facts (numbers, names, items, amounts) come from the invoice's frozen
  `data`. Look (accent colour, logo, notes, which columns) comes from the
  current template, so a template change also restyles old invoices.

  Noto Sans is bundled because the PDF standard fonts have no ₹ sign.
*/

const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");

let fontsRegistered = false;
function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: path.join(FONT_DIR, "NotoSans-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(FONT_DIR, "NotoSans-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  // Don't hyphenate words across lines.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

/** react-pdf can't draw SVG/WebP logos: ask Cloudinary for a PNG. */
function pdfImageUrl(url: string): string {
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
    return url.replace("/image/upload/", "/image/upload/f_png,w_600,c_limit/");
  }
  return url;
}

function makeStyles(accent: string) {
  return StyleSheet.create({
    page: { fontFamily: "NotoSans", fontSize: 9, color: "#1f2937", paddingTop: 36, paddingBottom: 56, paddingHorizontal: 40 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    brand: { fontSize: 18, fontWeight: "bold", color: accent },
    logo: { maxHeight: 44, maxWidth: 160, objectFit: "contain" },
    titleBlock: { alignItems: "flex-end" },
    title: { fontSize: 20, fontWeight: "bold", color: accent, textTransform: "uppercase", letterSpacing: 1 },
    meta: { marginTop: 4, alignItems: "flex-end" },
    metaRow: { flexDirection: "row", marginTop: 1 },
    metaLabel: { color: "#6b7280", marginRight: 6 },
    rule: { height: 2, backgroundColor: accent, marginTop: 14, marginBottom: 14 },
    parties: { flexDirection: "row", gap: 16 },
    party: { flex: 1 },
    partyTitle: { fontSize: 8, fontWeight: "bold", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
    partyName: { fontSize: 10.5, fontWeight: "bold", marginBottom: 2 },
    muted: { color: "#6b7280" },
    orderBox: { flexDirection: "row", marginTop: 16, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4 },
    orderCell: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: "#e5e7eb" },
    orderCellLast: { flex: 1, paddingVertical: 6, paddingHorizontal: 8 },
    cellLabel: { fontSize: 7.5, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6 },
    cellValue: { marginTop: 2, fontWeight: "bold" },
    table: { marginTop: 16 },
    th: { flexDirection: "row", backgroundColor: accent, color: "#ffffff", fontWeight: "bold", paddingVertical: 6, paddingHorizontal: 6 },
    tr: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
    colIndex: { width: 20 },
    colItem: { flex: 1, paddingRight: 8 },
    colQty: { width: 34, textAlign: "right" },
    colPrice: { width: 72, textAlign: "right" },
    colTotal: { width: 78, textAlign: "right" },
    itemName: { fontWeight: "bold" },
    itemSub: { fontSize: 8, color: "#6b7280", marginTop: 1 },
    summary: { flexDirection: "row", marginTop: 12, gap: 16 },
    words: { flex: 1 },
    totals: { width: 210 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    grandTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 4,
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: accent,
      color: "#ffffff",
      fontWeight: "bold",
      fontSize: 11,
      borderRadius: 3,
    },
    discount: { color: "#15803d" },
    notes: { marginTop: 20, flexDirection: "row", gap: 16 },
    terms: { flex: 1, fontSize: 8, color: "#4b5563", lineHeight: 1.4 },
    signature: { width: 160, alignItems: "center", justifyContent: "flex-end" },
    signLine: { width: "100%", borderTopWidth: 1, borderTopColor: "#9ca3af", marginTop: 28, paddingTop: 3, textAlign: "center", fontSize: 8, color: "#6b7280" },
    thanks: { marginTop: 18, textAlign: "center", fontWeight: "bold", color: accent, fontSize: 10 },
    footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7.5, color: "#9ca3af", textAlign: "center" },
  });
}

function InvoiceDocument({ invoice, settings }: { invoice: InvoiceRecord; settings: InvoiceSettings }) {
  const s = makeStyles(settings.accent_color || "#111827");
  const { data } = invoice;
  const { seller, buyer, totals } = data;

  const buyerLines = [
    buyer.line1,
    buyer.line2,
    [buyer.city, buyer.state, buyer.postal_code].filter(Boolean).join(", "),
    buyer.country,
  ].filter(Boolean);

  return (
    <Document title={`${data.title} ${invoice.invoice_number}`} author={seller.name} creator={seller.name}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            {settings.logo_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
              <Image src={pdfImageUrl(settings.logo_url)} style={s.logo} />
            ) : (
              <Text style={s.brand}>{seller.name}</Text>
            )}
          </View>

          <View style={s.titleBlock}>
            <Text style={s.title}>{data.title}</Text>
            <View style={s.meta}>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Invoice no.</Text>
                <Text style={{ fontWeight: "bold" }}>{invoice.invoice_number}</Text>
              </View>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Invoice date</Text>
                <Text>{formatInvoiceDate(invoice.issued_at)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.rule} />

        {/* Seller and buyer */}
        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.partyTitle}>Sold by</Text>
            <Text style={s.partyName}>{seller.name}</Text>
            {seller.legal_name ? <Text>Operated by {seller.legal_name}</Text> : null}
            {seller.address ? <Text style={s.muted}>{seller.address}</Text> : null}
            {seller.email ? <Text style={s.muted}>{seller.email}</Text> : null}
            {seller.phone ? <Text style={s.muted}>{seller.phone}</Text> : null}
            <Text style={{ marginTop: 3 }}>
              {seller.gstin ? `GSTIN: ${seller.gstin}` : "Not registered under GST"}
            </Text>
          </View>

          <View style={s.party}>
            <Text style={s.partyTitle}>Bill to / Ship to</Text>
            <Text style={s.partyName}>{buyer.name ?? "Customer"}</Text>
            {buyerLines.map((line, index) => (
              <Text key={index} style={s.muted}>
                {line}
              </Text>
            ))}
            {buyer.phone ? <Text style={s.muted}>{buyer.phone}</Text> : null}
            {buyer.email ? <Text style={s.muted}>{buyer.email}</Text> : null}
          </View>
        </View>

        {/* Order and payment */}
        <View style={s.orderBox}>
          <View style={s.orderCell}>
            <Text style={s.cellLabel}>Order no.</Text>
            <Text style={s.cellValue}>{data.order.number}</Text>
          </View>
          <View style={s.orderCell}>
            <Text style={s.cellLabel}>Order date</Text>
            <Text style={s.cellValue}>{formatInvoiceDate(data.order.placed_at)}</Text>
          </View>
          <View style={s.orderCell}>
            <Text style={s.cellLabel}>Payment</Text>
            <Text style={s.cellValue}>{paymentMethodLabel(data.payment.method)} · Paid</Text>
          </View>
          <View style={s.orderCellLast}>
            <Text style={s.cellLabel}>Payment reference</Text>
            <Text style={s.cellValue}>{data.payment.reference ?? "—"}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={s.table}>
          <View style={s.th} fixed>
            <Text style={s.colIndex}>#</Text>
            <Text style={s.colItem}>Item</Text>
            <Text style={s.colQty}>Qty</Text>
            <Text style={s.colPrice}>Unit price</Text>
            <Text style={s.colTotal}>Amount</Text>
          </View>

          {data.items.map((item, index) => {
            const details = [
              item.variant,
              settings.show_sku && item.sku ? `SKU ${item.sku}` : null,
            ].filter(Boolean);

            return (
              <View key={index} style={s.tr} wrap={false}>
                <Text style={s.colIndex}>{index + 1}</Text>
                <View style={s.colItem}>
                  <Text style={s.itemName}>{item.name ?? "Product"}</Text>
                  {details.length > 0 && <Text style={s.itemSub}>{details.join(" · ")}</Text>}
                  {settings.show_customization &&
                    item.customization.map((entry, i) => (
                      <Text key={i} style={s.itemSub}>
                        {entry.label}: {entry.value}
                      </Text>
                    ))}
                </View>
                <Text style={s.colQty}>{item.quantity}</Text>
                <Text style={s.colPrice}>{formatInvoiceAmount(item.unit_price)}</Text>
                <Text style={s.colTotal}>{formatInvoiceAmount(item.total)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={s.summary} wrap={false}>
          <View style={s.words}>
            <Text style={s.cellLabel}>Amount in words</Text>
            <Text style={{ marginTop: 2, fontWeight: "bold" }}>{amountInWords(totals.total)}</Text>
          </View>

          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={s.muted}>Subtotal</Text>
              <Text>{formatInvoiceAmount(totals.subtotal)}</Text>
            </View>
            {totals.discount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.discount}>Discount{totals.coupon_code ? ` (${totals.coupon_code})` : ""}</Text>
                <Text style={s.discount}>−{formatInvoiceAmount(totals.discount)}</Text>
              </View>
            )}
            <View style={s.totalRow}>
              <Text style={s.muted}>Shipping</Text>
              <Text>{totals.shipping > 0 ? formatInvoiceAmount(totals.shipping) : "Free"}</Text>
            </View>
            <View style={s.grandTotal}>
              <Text>Total paid</Text>
              <Text>{formatInvoiceAmount(totals.total)}</Text>
            </View>
          </View>
        </View>

        {/* Terms and signature */}
        <View style={s.notes} wrap={false}>
          <View style={s.terms}>
            {settings.terms ? (
              <>
                <Text style={[s.cellLabel, { marginBottom: 2 }]}>Terms</Text>
                <Text>{settings.terms}</Text>
              </>
            ) : null}
          </View>
          <View style={s.signature}>
            <Text style={{ fontWeight: "bold", textAlign: "center" }}>For {seller.name}</Text>
            <Text style={s.signLine}>{settings.signature_label}</Text>
          </View>
        </View>

        {settings.footer_note ? <Text style={s.thanks}>{settings.footer_note}</Text> : null}

        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `This is a computer-generated invoice and does not require a physical signature.   Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

/** The invoice as a PDF file. */
export async function renderInvoicePdf(invoice: InvoiceRecord, settings: InvoiceSettings): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<InvoiceDocument invoice={invoice} settings={settings} />);
}
