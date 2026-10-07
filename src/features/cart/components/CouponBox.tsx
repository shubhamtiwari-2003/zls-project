"use client";

import { useEffect, useRef, useState } from "react";
import { BadgePercent, Loader2, X } from "lucide-react";
import { useCartStore } from "@/features/cart/store/cartStore";
import { formatINR } from "@/lib/shop-config";
import { celebrateCoupon } from "@/features/cart/lib/couponConfetti";
import type { CartQuote } from "@/types/cart";

interface CouponBoxProps {
  quote: CartQuote | null;
  loading: boolean;
  disabled?: boolean;
}

/**
 * Enter / remove a coupon. The code is kept in the cart store and checked
 * by the server on every quote; the discount shown comes from the server.
 */
export function CouponBox({ quote, loading, disabled }: CouponBoxProps) {
  const couponCode = useCartStore((state) => state.couponCode);
  const couponNotice = useCartStore((state) => state.couponNotice);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const removeCoupon = useCartStore((state) => state.removeCoupon);

  const [input, setInput] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  // The code the customer just submitted: confetti only for that, not for a
  // coupon that was already applied when the page opened.
  const submittedCode = useRef<string | null>(null);

  const applied = quote?.coupon && quote.coupon.code === couponCode ? quote.coupon : null;

  useEffect(() => {
    if (applied && submittedCode.current === applied.code) {
      submittedCode.current = null;
      celebrateCoupon(boxRef.current);
    }
  }, [applied]);

  // A code is entered and the server hasn't answered yet.
  const checking = !!couponCode && !applied && (loading || !quote);

  if (applied) {
    return (
      <div
        ref={boxRef}
        className="flex items-start gap-3 rounded-xl border border-green-600/30 bg-green-500/10 px-4 py-3 animate-in fade-in-0 zoom-in-95 duration-300"
      >
        <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-green-700 dark:text-green-400" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-green-700 dark:text-green-400">
            {applied.code} applied · you save {formatINR(applied.discount)}
          </p>
          <p className="text-xs text-muted-foreground">{applied.description}</p>
        </div>
        <button
          type="button"
          onClick={removeCoupon}
          disabled={disabled}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
          aria-label={`Remove coupon ${applied.code}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const submit = () => {
    const code = input.trim();
    if (!code || disabled) return;

    submittedCode.current = code.toUpperCase().replace(/\s+/g, "");
    applyCoupon(code);
  };

  return (
    <div ref={boxRef}>
      <label htmlFor="coupon-code" className="mb-1.5 block text-sm font-medium">
        Have a coupon?
      </label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            // Inside the checkout form: apply instead of placing the order.
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Enter code"
          maxLength={30}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={disabled || checking}
          aria-invalid={!!couponNotice}
          aria-describedby={couponNotice ? "coupon-notice" : undefined}
          className={`min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm uppercase tracking-wide outline-none placeholder:normal-case placeholder:tracking-normal focus:ring-2 focus:ring-foreground/10 ${
            couponNotice ? "border-red-500" : "border-border"
          }`}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!input.trim() || disabled || checking}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
        >
          {checking && <Loader2 className="h-4 w-4 animate-spin" />}
          Apply
        </button>
      </div>
      {couponNotice && (
        <p id="coupon-notice" className="mt-1.5 text-xs text-red-600" role="alert">
          {couponNotice}
        </p>
      )}
    </div>
  );
}
