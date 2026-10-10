/**
 * After an admin change: clear the shop's server cache so customers see it
 * right away (/api/admin/revalidate). Fire-and-forget: if it fails, the
 * cache refreshes by itself within a minute (storefront-cache.ts).
 */
export function refreshStorefront() {
  fetch("/api/admin/revalidate", { method: "POST" }).catch(() => {
    // Ignore: the cache expires on its own.
  });
}
