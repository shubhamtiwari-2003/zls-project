"use client";

import confetti from "canvas-confetti";

const COLORS = ["#058e60", "#003D29", "#C6A15B", "#FACC15", "#F472B6", "#38BDF8"];

/**
 * A short confetti burst from `element` (the coupon box) when a coupon is
 * applied. Skipped for people who turned on "reduce motion".
 */
export function celebrateCoupon(element: HTMLElement | null) {
  const rect = element?.getBoundingClientRect();
  const origin = rect
    ? {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      }
    : { x: 0.5, y: 0.6 };

  const shared = {
    origin,
    colors: COLORS,
    disableForReducedMotion: true,
    zIndex: 100,
  };

  // Two bursts: a wide one and a tighter, faster one.
  confetti({ ...shared, particleCount: 70, spread: 75, startVelocity: 35, scalar: 0.9 });
  confetti({ ...shared, particleCount: 40, spread: 120, startVelocity: 25, decay: 0.92, scalar: 0.75 });
}
