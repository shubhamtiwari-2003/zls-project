import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { isExternalLink, toneClass, type Promotion } from "@/lib/promotions";

/** Campaign notes on a product page (Admin → Promotions → Product page notices). */
export function ProductNotices({ notices, className = "" }: { notices: Promotion[]; className?: string }) {
  if (notices.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {notices.map((notice) => {
        const external = notice.link_url ? isExternalLink(notice.link_url) : false;

        return (
          <div key={notice.id} className={`${toneClass(notice.tone)} flex items-start gap-3 rounded-2xl px-4 py-3 text-sm`}>
            <Sparkles size={18} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {notice.tag && <span className="mr-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{notice.tag}</span>}
                {notice.title}
              </p>
              {notice.body && <p className="mt-0.5 opacity-90">{notice.body}</p>}
              {notice.link_url && notice.cta_label && (
                <Link
                  href={notice.link_url}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  className="mt-1 inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                >
                  {notice.cta_label}
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
