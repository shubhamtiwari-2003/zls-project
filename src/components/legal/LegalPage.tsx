import Link from "next/link";
import type { ReactNode } from "react";
import { BUSINESS, POLICY_TERMS, missingBusinessDetails, operatedBy } from "@/lib/business";
import { LEGAL_PAGES } from "@/lib/legal-pages";

interface LegalPageProps {
  href: (typeof LEGAL_PAGES)[number]["href"];
  title: string;
  intro: ReactNode;
  children: ReactNode;
  showUpdated?: boolean;
}

/** Shared layout for policy pages: title, effective date, policy menu, content. */
export function LegalPage({ href, title, intro, children, showUpdated = true }: LegalPageProps) {
  const missing = missingBusinessDetails();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <div className="grid gap-10 lg:grid-cols-[220px_1fr] [&>*]:min-w-0">
        {/* Policy menu */}
        <nav aria-label="Policies" className="order-last lg:order-first">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Policies</p>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {LEGAL_PAGES.map((page) => {
              const active = page.href === href;
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-3 py-1.5 text-sm transition ${
                      active
                        ? "bg-foreground font-medium text-background"
                        : "border border-border text-muted-foreground hover:text-foreground lg:border-transparent lg:hover:bg-muted"
                    }`}
                  >
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <article>
          {missing.length > 0 && (
            <div role="alert" className="mb-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning ">
              <strong>Business details not filled in yet:</strong> {missing.join(", ")}. Update{" "}
              <code>src/lib/business.ts</code> before applying to Razorpay or going live.
            </div>
          )}

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {showUpdated && (
            <p className="mt-2 text-sm text-muted-foreground">Effective date: {POLICY_TERMS.effectiveDate}</p>
          )}

          <div className="mt-6 text-base leading-7 text-muted-foreground">{intro}</div>

          <div
            className="mt-8 space-y-4 text-[15px] leading-7 text-muted-foreground
              [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4
              [&_h2]:mt-10 [&_h2]:scroll-mt-28 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground
              [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-foreground
              [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6
              [&_strong]:font-semibold [&_strong]:text-foreground
              [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:border-border [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top
              [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground
              [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
          >
            {children}
          </div>

          <p className="mt-12 rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
            {BUSINESS.brandName} is operated by <strong className="text-foreground">{operatedBy()}</strong>.
            Questions about this policy? Write to{" "}
            <a href={`mailto:${BUSINESS.email}`} className="font-medium text-foreground underline underline-offset-4">
              {BUSINESS.email}
            </a>{" "}
            or see our <Link href="/contact-us" className="font-medium text-foreground underline underline-offset-4">contact details</Link>.
          </p>
        </article>
      </div>
    </div>
  );
}
