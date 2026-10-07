"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useShopSettings } from "@/components/providers/ShopSettingsProvider";
import { sellableStock, type InventoryJoin } from "@/lib/stock";

interface LowStockItem {
  // Variant ID.
  id: string;
  name: string;
  variantTitle: string;
  sellable: number;
}

interface VariantStockRow {
  id: string;
  title: string;
  products: { name: string } | null;
  inventory: InventoryJoin;
}

const MAX_ITEMS = 6;

// Overview card: variants that are low or out of stock, lowest first.
export function LowStockPanel() {
  const { lowStockThreshold } = useShopSettings();
  const [items, setItems] = useState<LowStockItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("product_variants")
      .select("id, title, products ( name ), inventory ( stock_available, stock_reserved )")
      .eq("is_active", true)
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;

        if (fetchError) {
          console.log("Low stock fetch error:", fetchError);
          setError(true);
          return;
        }

        setItems(
          ((data ?? []) as unknown as VariantStockRow[])
            .map((variant) => ({
              id: variant.id,
              name: variant.products?.name ?? "Product",
              variantTitle: variant.title ?? "",
              sellable: sellableStock(variant.inventory),
            }))
            .filter((item) => item.sellable <= lowStockThreshold)
            .sort((a, b) => a.sellable - b.sellable)
            .slice(0, MAX_ITEMS)
        );
      });

    return () => {
      cancelled = true;
    };
  }, [lowStockThreshold]);

  return (
    <div className="rounded-3xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-orange-500" size={20} />
          <h2 className="text-xl font-semibold">Low Stock</h2>
        </div>

        <Link href="/admin?tab=inventory" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Manage
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600">Could not load stock levels.</p>
      ) : items === null ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">All products are well stocked.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border p-4">
              <h3 className="font-medium">{item.name}</h3>
              {item.variantTitle && <p className="text-sm text-muted-foreground">{item.variantTitle}</p>}

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Remaining</span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    item.sellable <= 0
                      ? "bg-red-500/10 text-red-600"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  }`}
                >
                  {item.sellable < 0
                    ? `Oversold by ${-item.sellable}`
                    : item.sellable === 0
                      ? "Out of stock"
                      : `${item.sellable} left`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
