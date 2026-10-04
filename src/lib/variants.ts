// Variant helpers shared by the storefront, cart pricing, cart sync and admin.

import { purchasableStock, type InventoryJoin } from "@/lib/stock";

// variant_option_values ( product_option_values ( image:product_images ( url ) ) )
export type VariantValueImageJoin =
  | {
      product_option_values:
        | { image: { url: string } | { url: string }[] | null }
        | { image: { url: string } | { url: string }[] | null }[]
        | null;
    }[]
  | null
  | undefined;

const first = <T>(value: T | T[] | null | undefined): T | null =>
  (Array.isArray(value) ? value[0] : value) ?? null;

/**
 * The image that defines a variant (set on its visual option value, e.g.
 * Design: Batman). null if none — callers fall back to the product cover.
 */
export function variantImageUrl(links: VariantValueImageJoin): string | null {
  for (const link of links ?? []) {
    const image = first(first(link.product_option_values)?.image);
    if (image?.url) return image.url;
  }
  return null;
}

export interface VariantSummaryRow {
  id: string;
  is_active: boolean;
  price: number;
  inventory: InventoryJoin;
}

export interface VariantSummary {
  // Set when the product has exactly one active variant (can be added to
  // cart straight from a product card).
  singleVariantId: string | null;
  activeCount: number;
  // Total units purchasable across active variants; null = unlimited.
  stock: number | null;
}

/** Summarises a product's variants for product cards. */
export function summarizeVariants(
  variants: VariantSummaryRow[] | null | undefined,
  inventoryPolicy: string | null | undefined
): VariantSummary {
  const active = (variants ?? []).filter((variant) => variant.is_active);

  let stock: number | null = 0;

  for (const variant of active) {
    const variantStock = purchasableStock(inventoryPolicy, variant.inventory);
    if (variantStock === null) {
      stock = null;
      break;
    }
    stock += variantStock;
  }

  return {
    singleVariantId: active.length === 1 ? active[0].id : null,
    activeCount: active.length,
    stock: active.length === 0 ? 0 : stock,
  };
}

/**
 * ProductCard fields from a product's variants: total stock, and the
 * variant to add straight to the cart when there's only one and nothing
 * needs to be personalised.
 */
export function productCardVariantFields(
  variants: VariantSummaryRow[] | null | undefined,
  inventoryPolicy: string | null | undefined,
  // product_customization_fields ( id )
  customizationFields?: { id: string }[] | null
) {
  const summary = summarizeVariants(variants, inventoryPolicy);
  const isCustomizable = (customizationFields?.length ?? 0) > 0;

  return {
    stock: summary.stock,
    variantId: isCustomizable ? null : summary.singleVariantId,
    hasOptions: summary.activeCount > 1,
    isCustomizable,
  };
}
