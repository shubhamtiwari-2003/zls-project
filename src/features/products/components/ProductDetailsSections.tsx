import { Check, Package, Sparkles } from "lucide-react";
import type { ProductDetails, Specification } from "@/lib/product-details";

interface ProductDetailsSectionsProps {
  details: ProductDetails;
  // Size, weight etc. from the product's dimensions, shown first.
  baseSpecs: Specification[];
}

const headingClass = "flex items-center gap-2 text-lg font-semibold";

/** Highlights, What's in the box, Specifications and Care on the product page. */
export function ProductDetailsSections({ details, baseSpecs }: ProductDetailsSectionsProps) {
  const specifications = [...baseSpecs, ...details.specifications];

  return (
    <>
      {details.highlights.length > 0 && (
        <section className="mt-8" aria-labelledby="pdp-highlights">
          <h2 id="pdp-highlights" className={headingClass}>
            <Sparkles size={18} className="text-brand-bright" /> Highlights
          </h2>
          <ul className="mt-3 space-y-2">
            {details.highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-2.5 text-muted-foreground">
                <Check size={16} className="mt-1 shrink-0 text-brand-bright" />
                <span className="leading-7">{highlight}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {details.includedItems.length > 0 && (
        <section className="mt-8" aria-labelledby="pdp-in-the-box">
          <h2 id="pdp-in-the-box" className={headingClass}>
            <Package size={18} className="text-brand-bright" /> What&apos;s in the box
          </h2>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface">
            {details.includedItems.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-background px-2 text-xs font-bold tabular-nums">
                  {item.qty}×
                </span>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {specifications.length > 0 && (
        <section className="mt-8" aria-labelledby="pdp-specs">
          <h2 id="pdp-specs" className={headingClass}>
            Specifications
          </h2>
          <dl className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {specifications.map((spec) => (
              <div key={`${spec.label}-${spec.value}`} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-sm">
                <dt className="text-muted-foreground">{spec.label}</dt>
                <dd className="wrap-break-word font-medium">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {details.careInstructions && (
        <section className="mt-8" aria-labelledby="pdp-care">
          <h2 id="pdp-care" className={headingClass}>
            Care instructions
          </h2>
          <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{details.careInstructions}</p>
        </section>
      )}
    </>
  );
}
