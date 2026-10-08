"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Copy, Download, Loader2 } from "lucide-react";
import { formatINR } from "@/lib/shop-config";
import type { CustomizationSnapshotEntry } from "@/lib/customization";

type SignedUrls = Record<string, { preview: string; download: string }>;

/**
 * What the customer personalised on an order line: text to copy for
 * production, photos to download (private files, via signed links).
 */
export function OrderItemCustomization({ entries }: { entries: CustomizationSnapshotEntry[] | null }) {
  const [urls, setUrls] = useState<SignedUrls>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const publicIds = (entries ?? [])
    .map((entry) => entry.publicId)
    .filter((id): id is string => Boolean(id));
  const idsKey = publicIds.join(",");

  useEffect(() => {
    if (!idsKey) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingUrls(true);

    fetch("/api/admin/customer-uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicIds: idsKey.split(",") }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data?.urls) setUrls(data.urls);
      })
      .catch((error) => console.log("Customer photo links error:", error))
      .finally(() => {
        if (!cancelled) setLoadingUrls(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (!entries?.length) return null;

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Clipboard blocked: the text is still visible to copy by hand.
    }
  };

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-warning/10 p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-warning ">
        Personalised
      </p>

      {entries.map((entry) => {
        const signed = entry.publicId ? urls[entry.publicId] : undefined;

        return entry.type === "image" ? (
          <div key={entry.key} className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
              {signed ? (
                <Image src={signed.preview} alt={entry.label} fill sizes="64px" unoptimized className="object-cover" />
              ) : (
                loadingUrls && <Loader2 size={16} className="m-auto mt-6 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 text-xs">
              <p className="font-medium">{entry.label}</p>
              {entry.width && entry.height && (
                <p className="text-muted-foreground">
                  {entry.width} × {entry.height}px{entry.format ? ` · ${entry.format.toUpperCase()}` : ""}
                </p>
              )}
              {signed && (
                <a
                  href={signed.download}
                  className="mt-1 inline-flex items-center gap-1 font-medium text-brand-bright hover:underline"
                >
                  <Download size={12} />
                  Download original
                </a>
              )}
            </div>
          </div>
        ) : (
          <div key={entry.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0">
              <span className="text-muted-foreground">{entry.label}: </span>
              <span className="break-all font-mono text-sm font-semibold">{entry.value}</span>
              {entry.price > 0 && <span className="text-muted-foreground"> (+{formatINR(entry.price)})</span>}
            </span>
            <button
              type="button"
              onClick={() => copy(entry.key, entry.value)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
              aria-label={`Copy ${entry.label}`}
            >
              {copiedKey === entry.key ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
