/**
 * Returns `next` only if it is a same-site path ("/checkout"), otherwise
 * the fallback. Prevents open redirects like "?next=https://evil.com" or
 * "?next=//evil.com".
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }

  return next;
}
