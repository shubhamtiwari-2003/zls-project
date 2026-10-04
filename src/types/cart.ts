import type { CustomizationDisplay, CustomizationValues } from "@/lib/customization";

// What the browser sends: variant IDs, quantities and customization
// values, never prices.
export interface CartRequestItem {
  // The browser's cart line key, echoed back so it can match quote lines
  // to its items. Only an identifier: never trusted for anything else.
  lineKey: string;
  variantId: string;
  quantity: number;
  customization: CustomizationValues;
}

// A cart line priced by the server from the database.
export interface QuoteLine {
  lineKey: string;
  variantId: string;
  productId: string;
  name: string;
  // "Batman · A3"; empty for products without options.
  variantTitle: string;
  sku: string | null;
  image: string | null;
  href: string | null;
  // Variant price + customization add-ons.
  unitPrice: number;
  // Of which customization add-ons.
  customizationPrice: number;
  quantity: number;
  lineTotal: number;
  // Units this line can have (variant stock minus other lines of the same
  // variant) when the product can't be oversold; null = no limit.
  available: number | null;
  // Stable form of the checked values ('' = not customised).
  customizationKey: string;
  customization: CustomizationDisplay[];
}

export interface CartQuote {
  lines: QuoteLine[];
  // Line keys of variants that no longer exist or are not for sale.
  unavailable: string[];
  // Line keys with no stock left.
  outOfStock: string[];
  // Line keys whose quantity was reduced to the stock available.
  adjusted: string[];
  // Lines whose customization is missing or no longer valid.
  invalid: { lineKey: string; errors: Record<string, string> }[];
  subtotal: number;
  shipping: number;
  total: number;
}
