/**
 * Extracts the Cloudinary public_id from a delivery URL.
 *
 *   https://res.cloudinary.com/<cloud>/image/upload/v1790676467/z-layer-studio/products/file_emed1t.png
 *   → "z-layer-studio/products/file_emed1t"
 *
 * Returns null for URLs that are not Cloudinary uploads.
 */
export function publicIdFromCloudinaryUrl(url: string): string | null {
  let pathname: string;

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "res.cloudinary.com") return null;
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }

  const marker = "/upload/";
  const start = pathname.indexOf(marker);
  if (start === -1) return null;

  let segments = pathname.slice(start + marker.length).split("/");

  // Everything after the version segment (v123...) is the public_id.
  // Upload results (secure_url) always contain a version.
  const versionIndex = segments.findIndex((s) => /^v\d+$/.test(s));

  if (versionIndex !== -1) {
    segments = segments.slice(versionIndex + 1);
  } else if (/^[a-z]{1,3}_/.test(segments[0])) {
    // No version but looks like a transformation ("w_600", "c_fill,...").
    // Can't tell where the public_id starts, so don't guess.
    return null;
  }

  const joined = segments.join("/");
  const withoutExtension = joined.replace(/\.[a-z0-9]+$/i, "");

  return withoutExtension || null;
}
