"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCartStore } from "@/features/cart/store/cartStore";
import { startCartSync } from "@/features/cart/sync/cartSync";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * Mirrors the cart to the database while a user is signed in.
 * Renders nothing; mounted once in the root layout.
 */
export function CartSync() {
  const hydrated = useHydrated();
  const authLoading = useAuthStore((state) => state.loading);
  const userId = useAuthStore((state) => state.user?.id ?? null);

  useEffect(() => {
    if (!hydrated || authLoading) return;

    if (!userId) {
      // Signed out: the cart is saved on the account, so clear this device.
      // A guest cart (never synced) is left alone.
      if (useCartStore.getState().syncedUserId) {
        useCartStore.getState().resetCart();
      }
      return;
    }

    return startCartSync(userId);
  }, [hydrated, authLoading, userId]);

  return null;
}
