"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

const formatSegment = (segment: string) =>
  decodeURIComponent(segment)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function Breadcrumb() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="w-full py-8">
      <ol className="flex items-center gap-1 text-sm text-foreground flex-wrap">
        <li>
          <Link
            href="/"
            className="hover:text-foreground transition-colors"
          >
            Home
          </Link>
        </li>

        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1;

          return (
            <li key={href} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />

              {isLast ? (
                <span className="font-medium text-foreground">
                  {formatSegment(segment)}
                </span>
              ) : (
                <Link
                  href={href}
                  className="hover:text-foreground transition-colors"
                >
                  {formatSegment(segment)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}