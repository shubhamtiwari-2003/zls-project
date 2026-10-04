"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/features/cart/store/cartStore";
import { useHydrated } from "@/hooks/useHydrated";
import type { CartQuote } from "@/types/cart";

interface QuoteState {
  key: string;
  quote: CartQuote | null;
  error: string | null;
}

/**
 * Prices the current cart on the server whenever items or quantities change.
 * Also refreshes the cart's cached prices/names with the server values.
 */
export function useCartQuote() {
  const hydrated = useHydrated();
  const items = useCartStore((state) => state.items);
  const applyQuote = useCartStore((state) => state.applyQuote);

  // Only lines, quantities and customization values matter for pricing.
  const key = JSON.stringify(
    items.map((item) => [item.lineKey, item.variantId, item.quantity, item.customization ?? {}])
  );

  const [state, setState] = useState<QuoteState>({ key: "", quote: null, error: null });

  useEffect(() => {
    if (!hydrated) return;

    const payload = (JSON.parse(key) as [string, string, number, Record<string, string>][]).map(
      ([lineKey, variantId, quantity, customization]) => ({
        key: lineKey,
        variantId,
        quantity,
        customization,
      })
    );

    if (!payload.length) return;

    const controller = new AbortController();

    // Small debounce so rapid +/- clicks send one request.
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: payload }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error ?? "Could not price your cart.");
        }

        setState({ key, quote: data.quote, error: null });
        applyQuote(data.quote.lines);
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          key,
          quote: null,
          error: error instanceof Error ? error.message : "Could not price your cart.",
        });
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [key, hydrated, applyQuote]);

  const current = state.key === key;

  return {
    hydrated,
    items,
    quote: current ? state.quote : null,
    error: current ? state.error : null,
    loading: hydrated && items.length > 0 && !current,
  };
}
