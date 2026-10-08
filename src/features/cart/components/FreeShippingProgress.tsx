"use client";

import { PartyPopper, Truck } from "lucide-react";
import { useShopSettings } from "@/components/providers/ShopSettingsProvider";
import { formatINR } from "@/lib/shop-config";

interface FreeShippingProgressProps {
  subtotal: number;
  className?: string;
}

/**
 * "Add ₹X more for free delivery" with a progress bar. Hidden when shipping
 * is always free (Admin → Settings: free from ₹0 or fee ₹0).
 */
export function FreeShippingProgress({ subtotal, className = "" }: FreeShippingProgressProps) {
  const { freeShippingThreshold, shippingFee } = useShopSettings();

  if (freeShippingThreshold <= 0 || shippingFee <= 0 || subtotal <= 0) return null;

  const remaining = Math.max(freeShippingThreshold - subtotal, 0);
  const unlocked = remaining === 0;
  const percent = Math.min((subtotal / freeShippingThreshold) * 100, 100);

  return (
    <div className={`rounded-xl bg-muted px-4 py-3 ${className}`}>
      <p className="flex items-center gap-2 text-sm" aria-live="polite">
        {unlocked ? (
          <>
            <PartyPopper className="h-4 w-4 shrink-0 text-brand-bright" />
            <span>
              You&apos;ve unlocked <strong className="text-brand-bright">free delivery</strong>!
            </span>
          </>
        ) : (
          <>
            <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              Add <strong>{formatINR(remaining)}</strong> more for <strong>free delivery</strong>
            </span>
          </>
        )}
      </p>

      <div
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-label="Progress to free delivery"
        aria-valuemin={0}
        aria-valuemax={freeShippingThreshold}
        aria-valuenow={Math.min(subtotal, freeShippingThreshold)}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${unlocked ? "bg-brand-bright" : "bg-foreground"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {!unlocked && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Free delivery on orders of {formatINR(freeShippingThreshold)} or more.
        </p>
      )}
    </div>
  );
}
