"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false during SSR and the first client render, true afterwards.
 *
 * Use before rendering anything read from localStorage (e.g. the cart),
 * so server and client HTML match and React doesn't throw a hydration error.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
