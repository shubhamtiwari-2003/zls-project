// Customization fields (name on a keychain, photo in a frame, …).
//
// Shared by the product page (live price), the admin editor (price
// preview), the cart and the server. The server runs the same checks and
// pricing on every quote and checkout, so the browser's numbers are only
// ever a preview.

import { formatINR } from "@/lib/shop-config";

export type CustomizationFieldType = "text" | "image";

// Which characters a text field accepts (spaces are a separate switch).
export type TextCharset = "letters" | "alphanumeric" | "text";

export interface TextFieldConfig {
  // Counted without spaces, like the price.
  minLength: number;
  maxLength: number;
  charset: TextCharset;
  allowSpaces: boolean;
  uppercase: boolean;
  placeholder: string;
}

export interface ImageFieldConfig {
  maxMB: number;
  // Below these the customer is warned the print may look blurry.
  minWidth: number | null;
  minHeight: number | null;
  // "4:5"; shapes the preview. null = any.
  aspectRatio: string | null;
}

export type PricingRule =
  | { mode: "none" }
  // Added once when the field is filled in.
  | { mode: "flat"; amount: number }
  // First `freeChars` included, then `rate` per character.
  | { mode: "per_char"; rate: number; freeChars: number }
  // Price of the first tier the character count fits in.
  | { mode: "tiered"; tiers: { upTo: number; price: number }[] };

export type PricingMode = PricingRule["mode"];

interface FieldBase {
  // Absent for fields not saved yet (admin editor).
  id?: string;
  key: string;
  label: string;
  required: boolean;
  helpText: string | null;
  pricing: PricingRule;
}

export type TextField = FieldBase & { type: "text"; config: TextFieldConfig };
export type ImageField = FieldBase & { type: "image"; config: ImageFieldConfig };
export type CustomizationField = TextField | ImageField;

// fieldKey → text value, or customer_uploads.id for image fields.
export type CustomizationValues = Record<string, string>;

// What carts and order pages show for a line.
export interface CustomizationDisplay {
  key: string;
  label: string;
  value: string;
  imageUrl?: string | null;
}

// Frozen copy stored on order_items.customization.
export interface CustomizationSnapshotEntry {
  key: string;
  label: string;
  type: CustomizationFieldType;
  // Text as entered, or "Photo" for image fields.
  value: string;
  price: number;
  uploadId?: string;
  publicId?: string;
  width?: number | null;
  height?: number | null;
  format?: string | null;
}

/* -------------------------------------------------------------------------- */
/*                                   Limits                                   */
/* -------------------------------------------------------------------------- */

export const MAX_CUSTOMIZATION_FIELDS = 5;
export const MAX_TEXT_LENGTH = 60;
export const MAX_IMAGE_MB = 20;
export const MAX_TIERS = 10;
const MAX_PRICE = 100_000;
// Hard cap on what the browser may send per value.
const MAX_RAW_VALUE_LENGTH = 200;

export const IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);

export const CHARSETS: Record<TextCharset, { label: string; pattern: RegExp; error: string }> = {
  letters: {
    label: "Letters only (A–Z)",
    pattern: /^[A-Za-z ]*$/,
    error: "Only letters A–Z are allowed.",
  },
  alphanumeric: {
    label: "Letters and numbers",
    pattern: /^[A-Za-z0-9 ]*$/,
    error: "Only letters and numbers are allowed.",
  },
  text: {
    label: "Letters, numbers and . , ' & ! ? -",
    pattern: /^[A-Za-z0-9 .,'&!?-]*$/,
    error: "Only letters, numbers and . , ' & ! ? - are allowed.",
  },
};

/* -------------------------------------------------------------------------- */
/*                         Reading fields (with defaults)                     */
/* -------------------------------------------------------------------------- */

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function wholeNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.round(number), min), max);
}

function optionalWholeNumber(value: unknown, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = wholeNumber(value, 0, 0, max);
  return number > 0 ? number : null;
}

export const DEFAULT_TEXT_CONFIG: TextFieldConfig = {
  minLength: 1,
  maxLength: 12,
  charset: "letters",
  allowSpaces: true,
  uppercase: false,
  placeholder: "",
};

export const DEFAULT_IMAGE_CONFIG: ImageFieldConfig = {
  // Cloudinary's free plan rejects images above 10 MB.
  maxMB: 10,
  minWidth: null,
  minHeight: null,
  aspectRatio: null,
};

const ASPECT_RE = /^(\d{1,2}(?:\.\d{1,2})?):(\d{1,2}(?:\.\d{1,2})?)$/;

export function parseAspectRatio(value: string | null | undefined): number | null {
  const match = value?.match(ASPECT_RE);
  if (!match) return null;
  const [w, h] = [Number(match[1]), Number(match[2])];
  return w > 0 && h > 0 ? w / h : null;
}

export function readTextConfig(raw: unknown): TextFieldConfig {
  const c = asObject(raw);
  const maxLength = wholeNumber(c.maxLength, DEFAULT_TEXT_CONFIG.maxLength, 1, MAX_TEXT_LENGTH);

  return {
    minLength: wholeNumber(c.minLength, DEFAULT_TEXT_CONFIG.minLength, 0, maxLength),
    maxLength,
    charset: c.charset === "alphanumeric" || c.charset === "text" ? c.charset : "letters",
    allowSpaces: c.allowSpaces !== false,
    uppercase: c.uppercase === true,
    placeholder: typeof c.placeholder === "string" ? c.placeholder.slice(0, 60) : "",
  };
}

export function readImageConfig(raw: unknown): ImageFieldConfig {
  const c = asObject(raw);
  const aspect = typeof c.aspectRatio === "string" && parseAspectRatio(c.aspectRatio) ? c.aspectRatio : null;

  return {
    maxMB: wholeNumber(c.maxMB, DEFAULT_IMAGE_CONFIG.maxMB, 1, MAX_IMAGE_MB),
    minWidth: optionalWholeNumber(c.minWidth, 20_000),
    minHeight: optionalWholeNumber(c.minHeight, 20_000),
    aspectRatio: aspect,
  };
}

export function readPricing(raw: unknown, type: CustomizationFieldType): PricingRule {
  const p = asObject(raw);

  if (p.mode === "flat") {
    return { mode: "flat", amount: wholeNumber(p.amount, 0, 0, MAX_PRICE) };
  }

  // Character-based pricing only makes sense for text.
  if (type === "text" && p.mode === "per_char") {
    return {
      mode: "per_char",
      rate: wholeNumber(p.rate, 0, 0, MAX_PRICE),
      freeChars: wholeNumber(p.freeChars, 0, 0, MAX_TEXT_LENGTH),
    };
  }

  if (type === "text" && p.mode === "tiered" && Array.isArray(p.tiers)) {
    const tiers = p.tiers
      .slice(0, MAX_TIERS)
      .map((tier) => {
        const t = asObject(tier);
        return {
          upTo: wholeNumber(t.upTo, 0, 0, MAX_TEXT_LENGTH),
          price: wholeNumber(t.price, 0, 0, MAX_PRICE),
        };
      })
      .filter((tier) => tier.upTo > 0)
      .sort((a, b) => a.upTo - b.upTo);

    if (tiers.length) return { mode: "tiered", tiers };
  }

  return { mode: "none" };
}

// A product_customization_fields row.
export interface CustomizationFieldRow {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  help_text: string | null;
  config: unknown;
  pricing: unknown;
  position: number;
}

export function readFieldRow(row: CustomizationFieldRow): CustomizationField | null {
  const base = {
    id: row.id,
    key: row.key,
    label: row.label,
    required: row.required,
    helpText: row.help_text,
  };

  if (row.type === "text") {
    return { ...base, type: "text", config: readTextConfig(row.config), pricing: readPricing(row.pricing, "text") };
  }

  if (row.type === "image") {
    return { ...base, type: "image", config: readImageConfig(row.config), pricing: readPricing(row.pricing, "image") };
  }

  return null;
}

/** Rows (any order) → fields in display order. */
export function readFieldRows(rows: CustomizationFieldRow[] | null | undefined): CustomizationField[] {
  return [...(rows ?? [])]
    .sort((a, b) => a.position - b.position)
    .map(readFieldRow)
    .filter((field): field is CustomizationField => field !== null);
}

/* -------------------------------------------------------------------------- */
/*                                  Checking                                  */
/* -------------------------------------------------------------------------- */

/** Trims, collapses spaces and applies the field's case rule. */
export function normalizeText(config: TextFieldConfig, raw: string): string {
  const text = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  return config.uppercase ? text.toUpperCase() : text;
}

/** Characters that count toward length and price (spaces are free). */
export const countChars = (text: string) => text.replace(/\s/g, "").length;

/** Error for one text value, or null if it's fine. Empty is checked by the caller. */
export function textError(field: TextField, text: string): string | null {
  const { config } = field;
  const count = countChars(text);

  if (!config.allowSpaces && /\s/.test(text)) return "Spaces aren't allowed.";
  if (!CHARSETS[config.charset].pattern.test(text)) return CHARSETS[config.charset].error;
  if (count < config.minLength) {
    return `Enter at least ${config.minLength} character${config.minLength === 1 ? "" : "s"}.`;
  }
  if (count > config.maxLength) return `Use at most ${config.maxLength} characters.`;
  return null;
}

export interface CustomizationCheck {
  // Normalized values for the product's fields only (empty ones left out).
  values: CustomizationValues;
  // fieldKey → message
  errors: Record<string, string>;
}

/**
 * Checks values against a product's fields. Unknown keys are dropped.
 * Image values must look like upload IDs; the server also checks the
 * upload exists and belongs to the customer.
 */
export function checkCustomization(fields: CustomizationField[], input: unknown): CustomizationCheck {
  const raw = asObject(input);
  const values: CustomizationValues = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = typeof raw[field.key] === "string" ? (raw[field.key] as string) : "";

    if (field.type === "text") {
      const text = normalizeText(field.config, value.slice(0, MAX_RAW_VALUE_LENGTH));

      if (!text) {
        if (field.required) errors[field.key] = `Please enter ${field.label.toLowerCase()}.`;
        continue;
      }

      const error = textError(field, text);
      if (error) errors[field.key] = error;
      else values[field.key] = text;
    } else {
      if (!value) {
        if (field.required) errors[field.key] = "Please upload a photo.";
        continue;
      }

      if (isUuid(value)) values[field.key] = value;
      else errors[field.key] = "Please upload your photo again.";
    }
  }

  return { values, errors };
}

/** Customization values sent by a browser: a flat string map, size-capped. */
export function parseCustomizationInput(input: unknown): CustomizationValues | null {
  if (input === undefined || input === null) return {};
  if (typeof input !== "object" || Array.isArray(input)) return null;

  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > MAX_CUSTOMIZATION_FIELDS) return null;

  const values: CustomizationValues = {};

  for (const [key, value] of entries) {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) return null;
    if (typeof value !== "string" || value.length > MAX_RAW_VALUE_LENGTH) return null;
    if (value) values[key] = value;
  }

  return values;
}

/* -------------------------------------------------------------------------- */
/*                                   Pricing                                  */
/* -------------------------------------------------------------------------- */

/** Add-on for one field's (normalized) value. Empty value = 0. */
export function fieldPrice(field: CustomizationField, value: string | undefined): number {
  if (!value) return 0;

  const { pricing } = field;

  switch (pricing.mode) {
    case "flat":
      return pricing.amount;

    case "per_char": {
      if (field.type !== "text") return 0;
      return Math.max(0, countChars(value) - pricing.freeChars) * pricing.rate;
    }

    case "tiered": {
      if (field.type !== "text" || !pricing.tiers.length) return 0;
      const count = countChars(value);
      const tier = pricing.tiers.find((t) => count <= t.upTo) ?? pricing.tiers[pricing.tiers.length - 1];
      return tier.price;
    }

    default:
      return 0;
  }
}

/** Total add-on for a line, per unit. */
export function customizationPrice(fields: CustomizationField[], values: CustomizationValues): number {
  return fields.reduce((sum, field) => sum + fieldPrice(field, values[field.key]), 0);
}

/** One-line explanation for customers and admins. null = free. */
export function describePricing(field: CustomizationField): string | null {
  const { pricing } = field;

  switch (pricing.mode) {
    case "flat":
      return pricing.amount > 0 ? `+${formatINR(pricing.amount)}` : null;

    case "per_char":
      if (pricing.rate === 0) return null;
      return pricing.freeChars > 0
        ? `First ${pricing.freeChars} characters included, then +${formatINR(pricing.rate)} per character`
        : `+${formatINR(pricing.rate)} per character`;

    case "tiered":
      return pricing.tiers
        .map((tier, index) => {
          const from = index === 0 ? 1 : pricing.tiers[index - 1].upTo + 1;
          const range = from === tier.upTo ? `${from}` : `${from}–${tier.upTo}`;
          return `${range} characters: ${tier.price > 0 ? `+${formatINR(tier.price)}` : "included"}`;
        })
        .join(" · ");

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                               Line identity                                */
/* -------------------------------------------------------------------------- */

/**
 * Stable text form of the values ('' = not customised). Two cart lines of
 * the same variant are the same line only if this matches.
 */
export function customizationKey(values: CustomizationValues | null | undefined): string {
  const entries = Object.entries(values ?? {})
    .filter(([, value]) => value)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return entries.length ? JSON.stringify(entries) : "";
}

/** Identifies a cart line: the variant, plus its customization if any. */
export function cartLineKey(variantId: string, values?: CustomizationValues | null): string {
  const key = customizationKey(values);
  return key ? `${variantId}|${key}` : variantId;
}

/* -------------------------------------------------------------------------- */
/*                                   Images                                   */
/* -------------------------------------------------------------------------- */

/** Warning when a photo is smaller than the field's recommended size. */
export function imageQualityWarning(
  config: ImageFieldConfig,
  width: number | null | undefined,
  height: number | null | undefined
): string | null {
  if (!width || !height || (!config.minWidth && !config.minHeight)) return null;

  // Either orientation is fine: compare the long and short sides.
  const required = [config.minWidth ?? 0, config.minHeight ?? 0];
  const [minLong, minShort] = [Math.max(...required), Math.min(...required)];
  const [long, short] = [Math.max(width, height), Math.min(width, height)];

  if (long >= minLong && short >= minShort) return null;

  const recommended = minShort > 0 ? `${minLong}×${minShort}px` : `${minLong}px on the long side`;
  return `This photo is ${width}×${height}px. For a sharp print we recommend at least ${recommended}, so it may look blurry.`;
}

/* -------------------------------------------------------------------------- */
/*                               Admin helpers                                */
/* -------------------------------------------------------------------------- */

/** "Name on keychain" → "name_on_keychain", unique among `taken`. */
export function fieldKeyFromLabel(label: string, taken: string[]): string {
  let base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);

  if (!/^[a-z]/.test(base)) base = `field${base ? `_${base}` : ""}`;

  let key = base;
  for (let n = 2; taken.includes(key); n++) key = `${base}_${n}`;
  return key;
}

/** First problem with an admin's fields, or null. */
export function validateCustomizationFields(fields: CustomizationField[]): string | null {
  if (fields.length > MAX_CUSTOMIZATION_FIELDS) {
    return `A product can have at most ${MAX_CUSTOMIZATION_FIELDS} customization fields.`;
  }

  const keys = new Set<string>();

  for (const field of fields) {
    if (!field.label.trim()) return "Every customization field needs a label.";
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(field.key)) return `"${field.label}" has an invalid key.`;
    if (keys.has(field.key)) return `Two customization fields share the key "${field.key}".`;
    keys.add(field.key);

    if (field.type === "text") {
      const { minLength, maxLength } = field.config;
      if (maxLength < 1) return `"${field.label}": maximum length must be at least 1.`;
      if (minLength > maxLength) return `"${field.label}": minimum length is above the maximum.`;

      if (field.pricing.mode === "tiered") {
        const { tiers } = field.pricing;
        if (!tiers.length) return `"${field.label}": add at least one price tier.`;

        for (let i = 1; i < tiers.length; i++) {
          if (tiers[i].upTo <= tiers[i - 1].upTo) {
            return `"${field.label}": price tiers must go up in length.`;
          }
        }

        if (tiers[tiers.length - 1].upTo < maxLength) {
          return `"${field.label}": the last price tier must cover up to ${maxLength} characters.`;
        }
      }
    }
  }

  return null;
}
