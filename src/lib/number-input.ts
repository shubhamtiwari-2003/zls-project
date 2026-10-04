// Helpers for whole-number text inputs (prices in ₹, mm, grams).
//
// Used with <input type="text" inputMode="numeric"> instead of
// type="number": no spinner arrows, no stray "0" in empty fields, and
// non-digits are ignored as the admin types.

/** Digits only; empty → null. */
export function parseWholeNumber(text: string): number | null {
  const digits = text.replace(/\D/g, "").slice(0, 9);
  return digits ? Number(digits) : null;
}

/** 0 / null shows as an empty field. */
export function showWholeNumber(value: number | null | undefined): string {
  return value ? String(value) : "";
}
