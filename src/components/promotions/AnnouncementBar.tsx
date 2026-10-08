"use client";

import Link from "next/link";
import { isExternalLink, toneClass, type Promotion } from "@/lib/promotions";

/*
  The bar above the header (Admin → Promotions → Header announcements).
  One message: centred. Two or more: they scroll (marquee), pausing on
  hover. People who've asked for reduced motion see the first message only.
  The bar's colour comes from the first message.
*/

// Scroll speed: seconds per message for one full loop.
const SECONDS_PER_MESSAGE = 9;

function Message({ message, tabbable = true }: { message: Promotion; tabbable?: boolean }) {
  const text = (
    <>
      <span className="font-semibold">{message.title}</span>
      {message.body && <span className="opacity-90"> {message.body}</span>}
      {message.link_url && message.cta_label && <span className="ml-1.5 font-semibold underline underline-offset-2">{message.cta_label}</span>}
    </>
  );

  if (!message.link_url) return <span>{text}</span>;

  const external = isExternalLink(message.link_url);
  return (
    <Link
      href={message.link_url}
      tabIndex={tabbable ? undefined : -1}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="hover:opacity-90"
    >
      {text}
    </Link>
  );
}

export function AnnouncementBar({ messages }: { messages: Promotion[] }) {
  if (messages.length === 0) return null;

  const tone = toneClass(messages[0].tone);

  if (messages.length === 1) {
    return (
      <div className={`${tone} px-4 py-2 text-center text-xs sm:text-sm`} role="region" aria-label="Announcement">
        <Message message={messages[0]} />
      </div>
    );
  }

  // The list is repeated once so the loop is seamless (the track moves by
  // half its width). The copy is hidden from screen readers.
  const track = (copy: boolean) =>
    messages.map((message) => (
      <li key={`${copy ? "b" : "a"}-${message.id}`} aria-hidden={copy || undefined} className="flex shrink-0 items-center gap-8 pr-8">
        <Message message={message} tabbable={!copy} />
        <span aria-hidden className="opacity-60">✦</span>
      </li>
    ));

  return (
    <div className={`${tone} group overflow-hidden py-2 text-xs sm:text-sm`} role="region" aria-label="Announcements">
      {/* Reduced motion: no scrolling, first message only. */}
      <div className="hidden px-4 text-center motion-reduce:block">
        <Message message={messages[0]} />
      </div>

      <ul
        className="promo-marquee flex w-max whitespace-nowrap group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:hidden"
        style={{ animationDuration: `${messages.length * SECONDS_PER_MESSAGE}s` }}
      >
        {track(false)}
        {track(true)}
      </ul>
    </div>
  );
}
