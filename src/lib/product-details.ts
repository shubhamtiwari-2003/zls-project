// Descriptive product details shown on the product page, and MRP helpers.
// Stored on products (see 20261001120000_product_details.sql).

export interface IncludedItem {
  name: string;
  qty: number;
}

export interface Specification {
  label: string;
  value: string;
}

export interface ProductDetails {
  // "What's in the box" — required (at least one) when saving.
  includedItems: IncludedItem[];
  highlights: string[];
  specifications: Specification[];
  careInstructions: string;
}

export const DETAIL_LIMITS = {
  includedItems: 30,
  highlights: 12,
  specifications: 20,
  text: 120,
  careInstructions: 1000,
  maxQty: 999,
} as const;

export const EMPTY_DETAILS: ProductDetails = {
  includedItems: [],
  highlights: [],
  specifications: [],
  careInstructions: "",
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown, max: number = DETAIL_LIMITS.text) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Database values → clean details (drops malformed entries). */
export function readProductDetails(row: {
  included_items?: unknown;
  highlights?: unknown;
  specifications?: unknown;
  care_instructions?: string | null;
}): ProductDetails {
  return {
    includedItems: asArray(row.included_items)
      .map((item) => {
        const { name, qty } = (item ?? {}) as Record<string, unknown>;
        const quantity = Math.round(Number(qty));
        return { name: text(name), qty: Number.isFinite(quantity) && quantity > 0 ? Math.min(quantity, DETAIL_LIMITS.maxQty) : 1 };
      })
      .filter((item) => item.name),
    highlights: asArray(row.highlights).map((value) => text(value)).filter(Boolean),
    specifications: asArray(row.specifications)
      .map((spec) => {
        const { label, value } = (spec ?? {}) as Record<string, unknown>;
        return { label: text(label), value: text(value) };
      })
      .filter((spec) => spec.label && spec.value),
    careInstructions: text(row.care_instructions, DETAIL_LIMITS.careInstructions),
  };
}

/** Admin form → database payload (blank rows removed). */
export function productDetailsPayload(details: ProductDetails) {
  return {
    included_items: details.includedItems
      .map((item) => ({ name: item.name.trim(), qty: item.qty }))
      .filter((item) => item.name),
    highlights: details.highlights.map((value) => value.trim()).filter(Boolean),
    specifications: details.specifications
      .map((spec) => ({ label: spec.label.trim(), value: spec.value.trim() }))
      .filter((spec) => spec.label && spec.value),
    care_instructions: details.careInstructions.trim() || null,
  };
}

/** First problem in the admin form, or null. */
export function validateProductDetails(details: ProductDetails): string | null {
  const included = details.includedItems.filter((item) => item.name.trim());

  if (included.length === 0) {
    return "Add at least one item to \"What's in the box\" (e.g. 1 × Lamp).";
  }
  if (included.some((item) => !Number.isInteger(item.qty) || item.qty < 1 || item.qty > DETAIL_LIMITS.maxQty)) {
    return `Every "What's in the box" item needs a quantity between 1 and ${DETAIL_LIMITS.maxQty}.`;
  }
  if (details.specifications.some((spec) => Boolean(spec.label.trim()) !== Boolean(spec.value.trim()))) {
    return "Each specification needs both a name and a value.";
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                     MRP                                    */
/* -------------------------------------------------------------------------- */

export interface PriceDisplay {
  price: number;
  // Shown struck through; null = no discount to show.
  mrp: number | null;
  // Whole percent off the MRP.
  percentOff: number;
  saving: number;
}

/** Selling price vs MRP for display. No discount shown unless MRP > price. */
export function priceDisplay(price: number, compareAtPrice: number | null | undefined): PriceDisplay {
  const mrp = compareAtPrice && compareAtPrice > price ? compareAtPrice : null;

  return {
    price,
    mrp,
    percentOff: mrp ? Math.round(((mrp - price) / mrp) * 100) : 0,
    saving: mrp ? mrp - price : 0,
  };
}
