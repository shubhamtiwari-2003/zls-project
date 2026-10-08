"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { isExternalLink, toneClass, type Promotion } from "@/lib/promotions";

/*
  Campaign popup (Admin → Promotions → Popup). Shown once per visitor per
  popup, a few seconds after a shop page opens, and never during checkout.
  "Seen" is remembered in this browser; editing the popup in the admin
  doesn't show it again, a new popup does.
*/

const DELAY_MS = 2500;
const SKIP_PATHS = ["/cart", "/checkout", "/orders"];
const seenKey = (id: string) => `promo-popup-seen:${id}`;

export function PromoPopup({ popup }: { popup: Promotion | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const skip = SKIP_PATHS.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (!popup || skip) return;

    try {
      if (localStorage.getItem(seenKey(popup.id))) return;
    } catch {
      // Storage blocked: show it (it just won't be remembered).
    }

    const timer = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [popup, skip]);

  const close = useCallback(() => {
    setOpen(false);
    if (!popup) return;
    try {
      localStorage.setItem(seenKey(popup.id), "1");
    } catch {
      // Ignore: storage blocked.
    }
  }, [popup]);

  // Focus the close button; Escape closes.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!popup || !open) return null;

  const external = popup.link_url ? isExternalLink(popup.link_url) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-popup-title"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-background shadow-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-1.5 text-white transition hover:bg-black/60"
        >
          <X size={18} />
        </button>

        {popup.image_url ? (
          <div className="relative aspect-[4/3] w-full bg-muted">
            <Image src={popup.image_url} alt="" fill sizes="(min-width: 640px) 448px, 100vw" className="object-cover" />
          </div>
        ) : (
          // No image: a coloured header in the popup's colour.
          <div className={`${toneClass(popup.tone)} px-6 pb-6 pt-10`}>
            {popup.tag && <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{popup.tag}</p>}
            <p className="mt-1 text-3xl font-bold leading-tight">{popup.title}</p>
          </div>
        )}

        <div className="px-6 pb-6 pt-5">
          {popup.image_url && (
            <>
              {popup.tag && <p className="text-xs font-semibold uppercase tracking-wider text-brand-bright">{popup.tag}</p>}
              <h2 id="promo-popup-title" className="mt-1 text-2xl font-bold leading-tight">
                {popup.title}
              </h2>
            </>
          )}
          {!popup.image_url && (
            <h2 id="promo-popup-title" className="sr-only">
              {popup.title}
            </h2>
          )}

          {popup.body && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{popup.body}</p>}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            {popup.link_url && popup.cta_label && (
              <Link
                href={popup.link_url}
                onClick={close}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                {popup.cta_label}
              </Link>
            )}
            <button
              type="button"
              onClick={close}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium transition hover:bg-muted"
            >
              {popup.link_url && popup.cta_label ? "Maybe later" : "Got it"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
