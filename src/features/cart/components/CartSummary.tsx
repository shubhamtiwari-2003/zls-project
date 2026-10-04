import { FREE_SHIPPING_THRESHOLD, formatINR } from "@/lib/shop-config";
import type { CartQuote } from "@/types/cart";

interface CartSummaryProps {
  quote: CartQuote | null;
  loading: boolean;
}

// Totals always come from the server quote, never from localStorage prices.
export function CartSummary({ quote, loading }: CartSummaryProps) {
  const amount = (value: number | undefined) =>
    loading || value === undefined ? (
      <span className="inline-block h-4 w-16 animate-pulse rounded bg-border" />
    ) : (
      formatINR(value)
    );

  const remainingForFreeShipping =
    quote && quote.shipping > 0 ? FREE_SHIPPING_THRESHOLD - quote.subtotal : 0;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex justify-between">
        <span className="text-muted">Subtotal</span>
        <span>{amount(quote?.subtotal)}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-muted">Shipping</span>
        {!loading && quote?.shipping === 0 ? (
          <span className="text-green-600">FREE</span>
        ) : (
          <span>{amount(quote?.shipping)}</span>
        )}
      </div>

      {!loading && remainingForFreeShipping > 0 && (
        <p className="rounded-xl bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
          Add {formatINR(remainingForFreeShipping)} more for free shipping.
        </p>
      )}

      <div className="flex justify-between border-t border-border pt-4 text-lg font-bold">
        <span>Total</span>
        <span>{amount(quote?.total)}</span>
      </div>
    </div>
  );
}
