import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_CART_LINES, MAX_QTY_PER_ITEM, shippingFor } from "@/lib/shop-config";
import { purchasableStock, type InventoryJoin } from "@/lib/stock";
import { variantImageUrl, type VariantValueImageJoin } from "@/lib/variants";
import {
  cartLineKey,
  checkCustomization,
  customizationKey,
  fieldPrice,
  isUuid,
  parseCustomizationInput,
  readFieldRows,
  type CustomizationDisplay,
  type CustomizationFieldRow,
  type CustomizationSnapshotEntry,
} from "@/lib/customization";
import { customerUploadPreviewUrl } from "@/lib/customer-uploads.server";
import type { CartQuote, CartRequestItem, QuoteLine } from "@/types/cart";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LINE_KEY_LENGTH = 2100;

/**
 * Validates the cart sent by the browser. Only variant IDs, quantities and
 * customization values are accepted; any prices the client sends are
 * ignored. Duplicate lines are merged and quantities clamped to
 * MAX_QTY_PER_ITEM.
 */
export function parseCartItems(input: unknown): CartRequestItem[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_CART_LINES) {
    return null;
  }

  const merged = new Map<string, CartRequestItem>();

  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) return null;

    const { variantId, quantity, customization, key } = raw as Record<string, unknown>;

    if (typeof variantId !== "string" || !Number.isInteger(quantity) || (quantity as number) < 1) {
      return null;
    }

    const values = parseCustomizationInput(customization);
    if (!values) return null;

    const lineKey =
      typeof key === "string" && key && key.length <= MAX_LINE_KEY_LENGTH
        ? key
        : cartLineKey(variantId, values);

    const existing = merged.get(lineKey);

    merged.set(lineKey, {
      lineKey,
      variantId,
      customization: values,
      quantity: Math.min((existing?.quantity ?? 0) + (quantity as number), MAX_QTY_PER_ITEM),
    });
  }

  return Array.from(merged.values());
}

interface VariantRow {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  is_active: boolean;
  products: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    status: string | null;
    inventory_policy: string | null;
    categories: { slug: string } | null;
    product_images: { url: string; is_primary: boolean; order: number | null }[];
    product_customization_fields: CustomizationFieldRow[];
  };
  inventory: InventoryJoin;
  variant_option_values: VariantValueImageJoin;
}

interface UploadRow {
  id: string;
  cloudinary_public_id: string;
  width: number | null;
  height: number | null;
  format: string | null;
}

export interface PricedCart {
  quote: CartQuote;
  // lineKey → what gets frozen on the order line (server use only).
  snapshots: Map<string, CustomizationSnapshotEntry[]>;
}

/**
 * Prices a cart from the database. This is the single source of truth for
 * what the customer pays: used for the cart/checkout display and for
 * creating the order.
 *
 * `supabase` must be the customer's own client: their photos are found
 * through RLS, so nobody can order with someone else's upload.
 */
export async function priceCart(
  supabase: SupabaseClient,
  items: CartRequestItem[]
): Promise<PricedCart> {
  const ids = items.map((item) => item.variantId).filter((id) => UUID_RE.test(id));

  let rows: VariantRow[] = [];

  if (ids.length) {
    const { data, error } = await supabase
      .from("product_variants")
      .select(
        `id, title, sku, price, is_active,
         products!inner (
           id, name, slug, is_active, status, inventory_policy,
           categories ( slug ),
           product_images ( url, is_primary, "order" ),
           product_customization_fields ( id, key, label, type, required, help_text, config, pricing, position )
         ),
         inventory ( stock_available, stock_reserved ),
         variant_option_values ( product_option_values ( image:product_images ( url ) ) )`
      )
      .in("id", ids);

    if (error) throw new Error(error.message);

    rows = (data ?? []) as unknown as VariantRow[];
  }

  // Photos referenced by the cart that belong to this customer.
  const uploadIds = [
    ...new Set(items.flatMap((item) => Object.values(item.customization).filter(isUuid))),
  ];
  const uploads = new Map<string, UploadRow>();

  if (uploadIds.length) {
    const { data, error } = await supabase
      .from("customer_uploads")
      .select("id, cloudinary_public_id, width, height, format")
      .in("id", uploadIds);

    if (error) throw new Error(error.message);
    (data as UploadRow[] | null)?.forEach((row) => uploads.set(row.id, row));
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  const lines: QuoteLine[] = [];
  const snapshots = new Map<string, CustomizationSnapshotEntry[]>();
  const unavailable: string[] = [];
  const outOfStock: string[] = [];
  const adjusted: string[] = [];
  const invalid: CartQuote["invalid"] = [];

  // Units already given to earlier lines of the same variant.
  const allocated = new Map<string, number>();
  // variantId → stock, for the second pass below.
  const stockByVariant = new Map<string, number>();

  for (const item of items) {
    const variant = byId.get(item.variantId);
    const product = variant?.products;
    const basePrice = Number(variant?.price);

    if (
      !variant ||
      !product ||
      !variant.is_active ||
      !product.is_active ||
      product.status?.toLowerCase() === "draft" ||
      !Number.isFinite(basePrice) ||
      basePrice <= 0
    ) {
      unavailable.push(item.lineKey);
      continue;
    }

    // Customization: same rules as the product page, plus photo ownership.
    const fields = readFieldRows(product.product_customization_fields);
    const check = checkCustomization(fields, item.customization);

    for (const field of fields) {
      const uploadId = check.values[field.key];
      if (field.type === "image" && uploadId && !uploads.has(uploadId)) {
        check.errors[field.key] = "Please upload your photo again.";
        delete check.values[field.key];
      }
    }

    if (Object.keys(check.errors).length) {
      invalid.push({ lineKey: item.lineKey, errors: check.errors });
      continue;
    }

    // Units the customer can buy (on hand minus held by other checkouts);
    // null = unlimited ('continue selling'). Shared by all lines of a variant.
    const stock = purchasableStock(product.inventory_policy, variant.inventory);
    const taken = allocated.get(variant.id) ?? 0;
    const left = stock === null ? null : stock - taken;

    if (left !== null && left <= 0) {
      outOfStock.push(item.lineKey);
      continue;
    }

    let quantity = item.quantity;

    if (left !== null && quantity > left) {
      quantity = left;
      adjusted.push(item.lineKey);
    }

    allocated.set(variant.id, taken + quantity);
    if (stock !== null) stockByVariant.set(variant.id, stock);

    // Price and the record of what was personalised.
    const display: CustomizationDisplay[] = [];
    const snapshot: CustomizationSnapshotEntry[] = [];
    let customizationPrice = 0;

    for (const field of fields) {
      const value = check.values[field.key];
      if (!value) continue;

      const price = fieldPrice(field, value);
      customizationPrice += price;

      if (field.type === "image") {
        const upload = uploads.get(value)!;

        display.push({
          key: field.key,
          label: field.label,
          value: "Photo uploaded",
          imageUrl: customerUploadPreviewUrl(upload.cloudinary_public_id, 300),
        });

        snapshot.push({
          key: field.key,
          label: field.label,
          type: "image",
          value: "Photo",
          price,
          uploadId: upload.id,
          publicId: upload.cloudinary_public_id,
          width: upload.width,
          height: upload.height,
          format: upload.format,
        });
      } else {
        display.push({ key: field.key, label: field.label, value });
        snapshot.push({ key: field.key, label: field.label, type: "text", value, price });
      }
    }

    const unitPrice = basePrice + customizationPrice;

    const images = [...(product.product_images ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    const cover = images.find((image) => image.is_primary) ?? images[0];

    snapshots.set(item.lineKey, snapshot);

    lines.push({
      lineKey: item.lineKey,
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      variantTitle: variant.title ?? "",
      sku: variant.sku,
      image: variantImageUrl(variant.variant_option_values) ?? cover?.url ?? null,
      href: product.categories?.slug
        ? `/products/${product.categories.slug}/${product.slug}?variant=${variant.id}`
        : null,
      unitPrice,
      customizationPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      available: null,
      customizationKey: customizationKey(check.values),
      customization: display,
    });
  }

  // Each line may grow by whatever stock the other lines of its variant
  // leave free.
  for (const line of lines) {
    const stock = stockByVariant.get(line.variantId);
    if (stock !== undefined) {
      line.available = stock - ((allocated.get(line.variantId) ?? 0) - line.quantity);
    }
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shipping = shippingFor(subtotal);

  return {
    quote: {
      lines,
      unavailable,
      outOfStock,
      adjusted,
      invalid,
      subtotal,
      shipping,
      total: subtotal + shipping,
    },
    snapshots,
  };
}
