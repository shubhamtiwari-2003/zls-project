import Image from "next/image";
import { CreditCard, Landmark, ShieldCheck, Smartphone } from "lucide-react";

/**
 * "UPI & all cards accepted · Secured by Razorpay" strip on the product
 * page. The UPI and Razorpay logos are the official files (public/payments),
 * shown on white tiles in both themes so their dark lettering stays readable.
 */
export function PaymentMethodsBadge({ className = "" }: { className?: string }) {
  const methods = [
    { icon: Smartphone, label: "UPI" },
    { icon: CreditCard, label: "All cards" },
    { icon: Landmark, label: "Net banking" },
  ];

  return (
    <div className={`rounded-2xl border border-border bg-muted-foreground/40 px-4 py-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck size={16} className="shrink-0 text-success" />
            {/* Official UPI logo (public/payments), on white for its grey lettering. */}
            <span className="rounded-md bg-white px-1.5 py-0.5">
              <Image
                src="/payments/upi-logo.svg"
                alt="UPI"
                width={51}
                height={18}
                className="h-4.5 w-auto"
              />
            </span>
            &amp; all cards accepted
          </p>

          <ul className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {methods.map(({ icon: Icon, label }, index) => (
              <li key={label} className="flex items-center gap-1">
                {index > 0 && <span aria-hidden="true" className="mr-1 text-border">|</span>}
                <Icon size={13} className="shrink-0" />
                {label}
              </li>
            ))}
            <li className="flex items-center">
              <span aria-hidden="true" className="mr-2 text-border">|</span>
              No extra charges
            </li>
          </ul>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Secured by</span>
          <span className="rounded-md bg-white px-2 py-1">
            <Image
              src="/payments/razorpay-logo.svg"
              alt="Razorpay"
              width={84}
              height={18}
              className="h-4.5 w-auto"
            />
          </span>
        </div>
      </div>
    </div>
  );
}
