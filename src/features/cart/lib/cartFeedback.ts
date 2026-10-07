"use client";

import { toast } from "sonner";

/*
  "Added to cart" feedback, shared by every Add to cart button:

    1. a thumbnail flies from the button into the header cart icon
    2. the cart icon bounces when it lands
    3. a toast confirms it, with a "View cart" button

  The header owns the cart icon and drawer, so buttons announce the add
  with a window event and the header plays the animation.
*/

export const CART_ADDED_EVENT = "zls:cart-added";
export const CART_OPEN_EVENT = "zls:cart-open";

export interface CartAddedDetail {
  image: string | null;
  // Where the thumbnail starts (the clicked button).
  from: DOMRect | null;
}

interface AddedToCart {
  title: string;
  image?: string | null;
  // The product photo already on screen: reused so the thumbnail shows
  // instantly (it's in the browser cache).
  imageElement?: HTMLImageElement | null;
  quantity?: number;
  // The clicked element.
  source?: Element | null;
}

export function announceAddedToCart({
  title,
  image = null,
  imageElement = null,
  quantity = 1,
  source = null,
}: AddedToCart) {
  const onScreen = imageElement?.complete ? imageElement.currentSrc : "";

  window.dispatchEvent(
    new CustomEvent<CartAddedDetail>(CART_ADDED_EVENT, {
      detail: {
        image: onScreen || (image ? thumbnailUrl(image) : null),
        from: source?.getBoundingClientRect() ?? null,
      },
    })
  );

  toast.success("Added to cart", {
    description: quantity > 1 ? `${quantity} × ${title}` : title,
    action: {
      label: "View cart",
      onClick: () => window.dispatchEvent(new Event(CART_OPEN_EVENT)),
    },
  });
}

/** A small Cloudinary version of a product image, so it loads instantly. */
function thumbnailUrl(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
  return url.replace("/image/upload/", "/image/upload/w_112,h_112,c_fill,f_auto,q_auto/");
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Small bounce on the cart icon. */
export function bumpCartIcon(icon: HTMLElement) {
  if (prefersReducedMotion()) return;

  icon.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.3) rotate(-8deg)" },
      { transform: "scale(0.95) rotate(4deg)" },
      { transform: "scale(1)" },
    ],
    { duration: 450, easing: "ease-out" }
  );
}

/**
 * Flies a round thumbnail from `from` to the cart icon in an arc, then
 * resolves. Resolves immediately if there's nothing to animate.
 */
export function flyToCart(image: string | null, from: DOMRect | null, icon: HTMLElement): Promise<void> {
  const to = icon.getBoundingClientRect();
  const iconVisible = to.bottom > 0 && to.top < window.innerHeight;

  if (!from || !image || !iconVisible || prefersReducedMotion()) return Promise.resolve();

  const size = 56;
  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  const dx = to.left + to.width / 2 - size / 2 - startX;
  const dy = to.top + to.height / 2 - size / 2 - startY;

  const thumb = document.createElement("img");
  thumb.src = image;
  thumb.alt = "";
  thumb.setAttribute("aria-hidden", "true");
  Object.assign(thumb.style, {
    position: "fixed",
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "cover",
    borderRadius: "9999px",
    border: "2px solid white",
    background: "#e7e5e4",
    boxShadow: "0 8px 24px rgb(0 0 0 / 0.25)",
    zIndex: "100",
    pointerEvents: "none",
  });
  document.body.appendChild(thumb);

  // Up first, then down into the icon: an arc rather than a straight line.
  // The top of the arc stays on screen (buttons near the top get a flatter arc).
  const peakTop = startY + dy * 0.45;
  const lift = Math.max(0, Math.min(160, Math.abs(dy) / 2 + 60, peakTop - 8));

  const animation = thumb.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(0.9)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0.4 },
    ],
    { duration: 750, easing: "cubic-bezier(0.45, 0, 0.25, 1)" }
  );

  return animation.finished
    .catch(() => undefined)
    .then(() => {
      thumb.remove();
    });
}
