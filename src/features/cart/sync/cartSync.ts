"use client";

import { getSupabase } from "@/lib/supabase/lazy";
import { variantImageUrl, type VariantValueImageJoin } from "@/lib/variants";
import {
  cartLineKey,
  customizationKey,
  type CustomizationDisplay,
  type CustomizationValues,
} from "@/lib/customization";
import { useCartStore, type CartItem } from "@/features/cart/store/cartStore";

/*
  Keeps the local cart (zustand + localStorage) and cart_items in sync for
  a signed-in user. One row per cart line (variant + customization).

  - Start:  load the server cart.
              same user as last time → server wins (other devices' edits)
              guest cart             → merged into the account cart
  - Edits:  local changes are written to cart_items after a short debounce
            (only the rows that changed).
  - Focus:  when the tab becomes visible again, reload the server cart so
            edits made on another device show up.
*/

const FLUSH_DELAY_MS = 400;

interface SyncedRow {
  variantId: string;
  productId: string;
  quantity: number;
  customization: CustomizationValues;
}

// lineKey → what the server has
type SyncedMap = Map<string, SyncedRow>;

interface ServerCartRow {
  variant_id: string;
  product_id: string;
  quantity: number;
  customization: CustomizationValues | null;
  product_variants: {
    title: string;
    price: number;
    variant_option_values: VariantValueImageJoin;
    products: {
      name: string;
      slug: string;
      categories: { slug: string } | null;
      product_images: { url: string; is_primary: boolean; order: number | null }[];
      product_customization_fields: { key: string; label: string; type: string; position: number }[];
    } | null;
  } | null;
}

const toSyncedMap = (items: CartItem[]): SyncedMap =>
  new Map(
    items.map((item) => [
      item.lineKey,
      {
        variantId: item.variantId,
        productId: item.productId,
        quantity: item.quantity,
        customization: item.customization ?? {},
      },
    ])
  );

async function fetchServerCart(userId: string): Promise<CartItem[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `variant_id, product_id, quantity, customization,
       product_variants (
         title, price,
         variant_option_values ( product_option_values ( image:product_images ( url ) ) ),
         products (
           name, slug, categories ( slug ), product_images ( url, is_primary, "order" ),
           product_customization_fields ( key, label, type, position )
         )
       )`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as ServerCartRow[])
    .filter((row) => row.product_variants?.products)
    .map((row) => {
      const variant = row.product_variants!;
      const product = variant.products!;
      const images = [...(product.product_images ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      const cover = images.find((image) => image.is_primary) ?? images[0];
      const customization = row.customization ?? {};

      // Labels for display; prices and photo previews come with the next quote.
      const display: CustomizationDisplay[] = [...(product.product_customization_fields ?? [])]
        .sort((a, b) => a.position - b.position)
        .filter((field) => customization[field.key])
        .map((field) => ({
          key: field.key,
          label: field.label,
          value: field.type === "image" ? "Photo uploaded" : customization[field.key],
        }));

      return {
        lineKey: cartLineKey(row.variant_id, customization),
        variantId: row.variant_id,
        productId: row.product_id,
        title: product.name,
        variantTitle: variant.title ?? "",
        price: Number(variant.price),
        image: variantImageUrl(variant.variant_option_values) ?? cover?.url ?? "",
        href: product.categories?.slug
          ? `/products/${product.categories.slug}/${product.slug}?variant=${row.variant_id}`
          : null,
        quantity: row.quantity,
        customization,
        customizationDisplay: display.length ? display : undefined,
      };
    });
}

// Guest items are added to the account cart (quantities summed, capped).
function mergeGuestCart(server: CartItem[], guest: CartItem[]): CartItem[] {
  const merged = new Map(server.map((item) => [item.lineKey, { ...item }]));

  for (const item of guest) {
    const existing = merged.get(item.lineKey);

    if (existing) {
      existing.quantity = Math.min(existing.quantity + item.quantity, useCartStore.getState().maxPerItem);
    } else {
      merged.set(item.lineKey, { ...item });
    }
  }

  return Array.from(merged.values());
}

/** Starts syncing for `userId`. Returns a stop function. */
export function startCartSync(userId: string): () => void {
  let stopped = false;
  let ready = false; // initial load done
  let synced: SyncedMap = new Map(); // what the server has
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let flushing = false;
  let dirtyWhileFlushing = false;
  let applyingRemote = false;

  // Write local changes (only the rows that differ from the server).
  const flush = async () => {
    flushTimer = null;
    if (stopped || !ready) return;

    if (flushing) {
      dirtyWhileFlushing = true;
      return;
    }

    flushing = true;

    try {
      const supabase = await getSupabase();
      do {
        dirtyWhileFlushing = false;

        const current = toSyncedMap(useCartStore.getState().items);

        const upserts = [...current]
          .filter(([lineKey, row]) => synced.get(lineKey)?.quantity !== row.quantity)
          .map(([, row]) => ({
            user_id: userId,
            variant_id: row.variantId,
            // Required column; the DB trigger re-sets it from the variant.
            product_id: row.productId,
            quantity: row.quantity,
            customization: row.customization,
            customization_key: customizationKey(row.customization),
          }));

        const deletes = [...synced]
          .filter(([lineKey]) => !current.has(lineKey))
          .map(([, row]) => row);

        if (upserts.length) {
          const { error } = await supabase
            .from("cart_items")
            .upsert(upserts, { onConflict: "user_id,variant_id,customization_key" });
          if (error) throw new Error(error.message);
        }

        // One request per removed line (rows are matched on two columns).
        const results = await Promise.all(
          deletes.map((row) =>
            supabase
              .from("cart_items")
              .delete()
              .eq("user_id", userId)
              .eq("variant_id", row.variantId)
              .eq("customization_key", customizationKey(row.customization))
          )
        );

        const deleteError = results.find((result) => result.error)?.error;
        if (deleteError) throw new Error(deleteError.message);

        synced = current;
      } while (dirtyWhileFlushing && !stopped);
    } catch (error) {
      // Local cart stays as-is; the next change or tab focus retries.
      console.log("Cart sync error:", error);
    } finally {
      flushing = false;
    }
  };

  const scheduleFlush = () => {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  };

  const applyRemote = (items: CartItem[]) => {
    applyingRemote = true;
    useCartStore.getState().replaceItems(items, userId);
    applyingRemote = false;
  };

  // First load: merge a guest cart, or take the server's cart.
  const init = async () => {
    try {
      const server = await fetchServerCart(userId);
      if (stopped) return;

      const state = useCartStore.getState();
      const items =
        state.syncedUserId === userId
          ? server
          : mergeGuestCart(server, state.syncedUserId === null ? state.items : []);

      synced = toSyncedMap(server);
      applyRemote(items);
      ready = true;

      // Push merged guest items (no-op if nothing changed).
      await flush();
    } catch (error) {
      console.log("Cart sync start error:", error);
    }
  };

  // Tab visible again: pick up edits from other devices (server wins),
  // unless this tab has unsaved edits of its own.
  const pull = async () => {
    if (flushing || flushTimer) return;

    const before = useCartStore.getState().items;

    try {
      const server = await fetchServerCart(userId);

      if (stopped || flushing || flushTimer || useCartStore.getState().items !== before) return;

      synced = toSyncedMap(server);
      applyRemote(server);
    } catch (error) {
      console.log("Cart sync refresh error:", error);
    }
  };

  const handleVisibility = () => {
    if (document.visibilityState !== "visible") return;
    if (ready) pull();
    else init();
  };

  const unsubscribe = useCartStore.subscribe((state, previous) => {
    if (ready && !applyingRemote && state.items !== previous.items) scheduleFlush();
  });

  document.addEventListener("visibilitychange", handleVisibility);
  init();

  return () => {
    // Save pending edits before stopping.
    if (flushTimer) {
      clearTimeout(flushTimer);
      flush();
    }

    stopped = true;
    unsubscribe();
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}
