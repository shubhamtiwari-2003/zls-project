// next/image loader (set in next.config.mjs): Cloudinary resizes and
// compresses images on its CDN instead of the Next.js server downloading
// the original (product photos can be 7 MB+) and resizing it itself.
//
//   https://res.cloudinary.com/<cloud>/image/upload/v1/products/a.png
//   → https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_limit,w_1080/v1/products/a.png
//
// f_auto  → WebP/AVIF when the browser supports it
// q_auto  → Cloudinary picks the compression
// c_limit → never enlarges past the original size
//
// Anything else (local files, other hosts) is returned as is. Private
// customer uploads use signed "authenticated" URLs, which can't be changed;
// they are shown with `unoptimized`, so they never reach this loader.

interface LoaderParams {
  src: string;
  width: number;
  quality?: number;
}

const UPLOAD_MARKER = "/image/upload/";

export default function cloudinaryLoader({ src, width, quality }: LoaderParams): string {
  if (src.startsWith("https://res.cloudinary.com/") && src.includes(UPLOAD_MARKER)) {
    const transformation = ["f_auto", quality ? `q_${quality}` : "q_auto", "c_limit", `w_${width}`].join(",");
    return src.replace(UPLOAD_MARKER, `${UPLOAD_MARKER}${transformation}/`);
  }

  // Unsplash resizes with ?w=.
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("auto", "format");
    if (quality) url.searchParams.set("q", String(quality));
    return url.toString();
  }

  // Local files (/logo.png, /_next/static/...): served as they are. The
  // width parameter only tells next/image the loader handled it.
  return src.startsWith("/") ? `${src}${src.includes("?") ? "&" : "?"}w=${width}` : src;
}
