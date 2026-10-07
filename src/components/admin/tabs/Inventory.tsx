"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, Minus, Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useShopSettings } from "@/components/providers/ShopSettingsProvider";
import { variantImageUrl, type VariantValueImageJoin } from "@/lib/variants";

type Policy = "deny" | "continue";
type StockFilter = "all" | "low" | "out";

// One row per active variant.
interface InventoryRow {
  // Variant ID.
  id: string;
  productId: string;
  name: string;
  // "Batman · A3"; empty for products without options.
  variantTitle: string;
  sku: string | null;
  inventory_policy: Policy;
  imageUrl: string | null;
  // On hand (editable).
  stock: number;
  // Held by unpaid checkouts.
  reserved: number;
  updatedAt: string | null;
}

// What customers can still buy.
const sellable = (row: InventoryRow) => row.stock - row.reserved;

interface VariantQueryRow {
  id: string;
  title: string;
  sku: string | null;
  products: {
    id: string;
    name: string;
    inventory_policy: string | null;
    product_images: { url: string; is_primary: boolean; order: number | null }[];
  } | null;
  inventory:
    | { stock_available: number; stock_reserved: number; updated_at: string | null }
    | { stock_available: number; stock_reserved: number; updated_at: string | null }[]
    | null;
  variant_option_values: VariantValueImageJoin;
}

const MAX_STOCK = 100000;

function stockStatus(stock: number, lowStockThreshold: number) {
  if (stock < 0) return { label: "Oversold", className: "bg-red-500/10 text-red-600" };
  if (stock === 0) return { label: "Out of stock", className: "bg-red-500/10 text-red-600" };
  if (stock <= lowStockThreshold) {
    return { label: "Low stock", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" };
  }
  return { label: "In stock", className: "bg-green-500/10 text-green-700 dark:text-green-400" };
}

export default function Inventory() {
  const { lowStockThreshold } = useShopSettings();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");

  // Unsaved stock edits, by variant ID (kept as text while typing).
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  // =========================================
  // FETCH
  // =========================================

  const fetchInventory = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("product_variants")
      .select(
        `id, title, sku,
         products ( id, name, inventory_policy, product_images ( url, is_primary, "order" ) ),
         inventory ( stock_available, stock_reserved, updated_at ),
         variant_option_values ( product_option_values ( image:product_images ( url ) ) )`
      )
      .eq("is_active", true)
      .order("position", { ascending: true });

    if (fetchError) {
      console.log("Inventory fetch error:", fetchError);
      setError(fetchError.message || "Failed to load inventory.");
      setLoading(false);
      return;
    }

    setRows(
      ((data ?? []) as unknown as VariantQueryRow[])
        .filter((variant) => variant.products)
        .map((variant): InventoryRow => {
          const product = variant.products!;
          const inventory = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;
          const images = [...(product.product_images ?? [])].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          const cover = (images.find((image) => image.is_primary) ?? images[0])?.url ?? null;

          return {
            id: variant.id,
            productId: product.id,
            name: product.name,
            variantTitle: variant.title ?? "",
            sku: variant.sku,
            inventory_policy: product.inventory_policy === "continue" ? "continue" : "deny",
            imageUrl: variantImageUrl(variant.variant_option_values) ?? cover,
            stock: Number(inventory?.stock_available ?? 0),
            reserved: Number(inventory?.stock_reserved ?? 0),
            updatedAt: inventory?.updated_at ?? null,
          };
        })
        // Group a product's variants together.
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    // Async fetch; state is set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInventory();
  }, [fetchInventory]);

  // =========================================
  // FILTER
  // =========================================

  const counts = useMemo(
    () => ({
      all: rows.length,
      low: rows.filter((row) => sellable(row) > 0 && sellable(row) <= lowStockThreshold).length,
      out: rows.filter((row) => sellable(row) <= 0).length,
    }),
    [rows, lowStockThreshold]
  );

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.variantTitle.toLowerCase().includes(query) ||
        row.sku?.toLowerCase().includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "low" && sellable(row) > 0 && sellable(row) <= lowStockThreshold) ||
        (filter === "out" && sellable(row) <= 0);

      return matchesSearch && matchesFilter;
    });
  }, [rows, search, filter, lowStockThreshold]);

  // =========================================
  // EDIT
  // =========================================

  const setDraft = (id: string, value: string) => {
    setDrafts((current) => ({ ...current, [id]: value }));
    setRowErrors((current) => ({ ...current, [id]: "" }));
  };

  const stepDraft = (row: InventoryRow, delta: number) => {
    const current = Number(drafts[row.id] ?? row.stock);
    const base = Number.isFinite(current) ? current : row.stock;
    setDraft(row.id, String(Math.max(0, base + delta)));
  };

  const saveStock = async (row: InventoryRow) => {
    const raw = drafts[row.id];
    const value = Number(raw);

    if (raw === undefined || raw.trim() === "" || !Number.isInteger(value) || value < 0 || value > MAX_STOCK) {
      setRowErrors((current) => ({
        ...current,
        [row.id]: `Enter a whole number from 0 to ${MAX_STOCK}.`,
      }));
      return;
    }

    setSavingId(row.id);

    // .select() makes an RLS-blocked update visible (0 rows, no error).
    const { data, error: updateError } = await supabase
      .from("inventory")
      .update({ stock_available: value, updated_at: new Date().toISOString() })
      .eq("variant_id", row.id)
      .select("stock_available, stock_reserved, updated_at");

    setSavingId(null);

    if (updateError || !data?.length) {
      console.log("Stock update error:", updateError);
      setRowErrors((current) => ({
        ...current,
        [row.id]: updateError?.message ?? "Stock was not saved. Check admin permissions.",
      }));
      return;
    }

    setRows((current) =>
      current.map((r) =>
        r.id === row.id
          ? {
              ...r,
              stock: Number(data[0].stock_available),
              reserved: Number(data[0].stock_reserved),
              updatedAt: data[0].updated_at,
            }
          : r
      )
    );

    setDrafts((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });
  };

  const savePolicy = async (row: InventoryRow, policy: Policy) => {
    setSavingId(row.id);

    const { data, error: updateError } = await supabase
      .from("products")
      .update({ inventory_policy: policy })
      .eq("id", row.productId)
      .select("id");

    setSavingId(null);

    if (updateError || !data?.length) {
      console.log("Policy update error:", updateError);
      setRowErrors((current) => ({
        ...current,
        [row.id]: updateError?.message ?? "Policy was not saved. Check admin permissions.",
      }));
      return;
    }

    // Policy is per product: applies to all its variants.
    setRows((current) =>
      current.map((r) => (r.productId === row.productId ? { ...r, inventory_policy: policy } : r))
    );
  };

  // =========================================
  // RENDER
  // =========================================

  const filterButton = (value: StockFilter, label: string) => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        filter === value ? "bg-foreground text-background" : "border border-border hover:bg-background"
      }`}
    >
      {label} ({counts[value]})
    </button>
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="mt-1 text-muted-foreground">
          Set units on hand. Units in an unpaid checkout are held for up to 30 minutes and
          deducted automatically when the order is paid.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* FILTERS */}
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, variant or SKU..."
            className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filterButton("all", "All")}
          {filterButton("low", "Low stock")}
          {filterButton("out", "Out of stock")}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-border">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">On hand</th>
                <th className="px-6 py-4 font-medium">Reserved</th>
                <th className="px-6 py-4 font-medium">When out of stock</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    Loading inventory...
                  </td>
                </tr>
              )}

              {!loading && visibleRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No products match.
                  </td>
                </tr>
              )}

              {!loading &&
                visibleRows.map((row) => {
                  const status = stockStatus(sellable(row), lowStockThreshold);
                  const draft = drafts[row.id];
                  const dirty = draft !== undefined && draft !== String(row.stock);
                  const saving = savingId === row.id;

                  return (
                    <tr key={row.id} className="border-b border-border align-top last:border-0">
                      {/* Product */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                            {row.imageUrl ? (
                              <Image src={row.imageUrl} alt={row.name} fill sizes="48px" className="object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{row.name}</p>
                            {row.variantTitle && <p className="truncate text-sm">{row.variantTitle}</p>}
                            <p className="text-xs text-muted-foreground">{row.sku || "No SKU"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-xl border border-border">
                            <button
                              onClick={() => stepDraft(row, -1)}
                              disabled={saving}
                              className="cursor-pointer p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                              aria-label="Decrease stock"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={MAX_STOCK}
                              step={1}
                              value={draft ?? String(row.stock)}
                              onChange={(e) => setDraft(row.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && dirty) saveStock(row);
                              }}
                              disabled={saving}
                              className="w-20 bg-transparent py-2 text-center text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              aria-label={`Stock for ${row.name}`}
                            />
                            <button
                              onClick={() => stepDraft(row, 1)}
                              disabled={saving}
                              className="cursor-pointer p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                              aria-label="Increase stock"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {dirty && (
                            <>
                              <button
                                onClick={() => saveStock(row)}
                                disabled={saving}
                                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-xs font-medium text-background disabled:opacity-50"
                              >
                                {saving && <Loader2 size={12} className="animate-spin" />}
                                Save
                              </button>
                              <button
                                onClick={() =>
                                  setDrafts((current) => {
                                    const next = { ...current };
                                    delete next[row.id];
                                    return next;
                                  })
                                }
                                disabled={saving}
                                className="cursor-pointer rounded-xl px-2 py-2 text-xs text-muted-foreground hover:text-foreground"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>

                        {rowErrors[row.id] && <p className="mt-2 text-xs text-red-600">{rowErrors[row.id]}</p>}

                        {row.updatedAt && !rowErrors[row.id] && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Updated{" "}
                            {new Date(row.updatedAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </td>

                      {/* Reserved */}
                      <td className="px-6 py-5 text-sm">
                        {row.reserved > 0 ? (
                          <span title="Held by unpaid checkouts">
                            {row.reserved} in checkout
                            <span className="block text-xs text-muted-foreground">{sellable(row)} sellable</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Policy */}
                      <td className="px-6 py-5">
                        <select
                          value={row.inventory_policy}
                          onChange={(e) => savePolicy(row, e.target.value as Policy)}
                          disabled={saving}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                        >
                          <option value="deny">Stop selling</option>
                          <option value="continue">Continue selling</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
