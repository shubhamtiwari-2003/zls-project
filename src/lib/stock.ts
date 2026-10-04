// Stock helpers shared by the storefront, cart pricing and admin.

export type InventoryJoin =
  | { stock_available: number; stock_reserved?: number | null }
  | { stock_available: number; stock_reserved?: number | null }[]
  | null
  | undefined;

function inventoryRow(inventory: InventoryJoin) {
  // One-to-one join; PostgREST may return an object or a one-item array.
  return Array.isArray(inventory) ? inventory[0] : inventory;
}

/** Units on hand minus units held by unpaid checkouts. Can be negative (oversold). */
export function sellableStock(inventory: InventoryJoin): number {
  const row = inventoryRow(inventory);
  return Number(row?.stock_available ?? 0) - Number(row?.stock_reserved ?? 0);
}

/**
 * How many units a customer can buy, or null when unlimited
 * ('continue' policy = keep selling when out of stock).
 */
export function purchasableStock(
  policy: string | null | undefined,
  inventory: InventoryJoin
): number | null {
  if ((policy ?? "deny") !== "deny") return null;
  return Math.max(0, sellableStock(inventory));
}
