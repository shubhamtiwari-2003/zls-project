import Image from "next/image";
import type { CustomizationDisplay } from "@/lib/customization";

interface CartItemCustomizationProps {
  entries?: CustomizationDisplay[] | null;
  // fieldKey → problem reported by the server quote.
  errors?: Record<string, string>;
  className?: string;
}

/** "Name: ANNA" / photo thumbnail lines under a cart or order item. */
export function CartItemCustomization({ entries, errors, className = "" }: CartItemCustomizationProps) {
  const errorList = Object.entries(errors ?? {});

  if (!entries?.length && !errorList.length) return null;

  return (
    <div className={`space-y-1 text-xs ${className}`}>
      {entries?.map((entry) => (
        <div key={entry.key} className="flex min-w-0 items-center gap-2 text-muted">
          {entry.imageUrl && (
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-border bg-background">
              {/* Signed private URL: skip the image optimizer's shared cache. */}
              <Image src={entry.imageUrl} alt={entry.label} fill sizes="32px" unoptimized className="object-cover" />
            </span>
          )}
          <span className="min-w-0 truncate">
            {entry.label}: <span className="font-medium text-foreground">{entry.value}</span>
          </span>
        </div>
      ))}

      {errorList.map(([key, message]) => (
        <p key={key} className="font-medium text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}
