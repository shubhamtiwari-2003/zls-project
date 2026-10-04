"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, Type, X } from "lucide-react";
import { parseWholeNumber, showWholeNumber } from "@/lib/number-input";
import { formatINR } from "@/lib/shop-config";
import {
  CHARSETS,
  DEFAULT_IMAGE_CONFIG,
  DEFAULT_TEXT_CONFIG,
  MAX_CUSTOMIZATION_FIELDS,
  MAX_TEXT_LENGTH,
  MAX_TIERS,
  MAX_IMAGE_MB,
  countChars,
  describePricing,
  fieldKeyFromLabel,
  fieldPrice,
  normalizeText,
  textError,
  type ImageFieldConfig,
  type PricingRule,
  type TextCharset,
  type TextFieldConfig,
} from "@/lib/customization";
import type { CustomizationFieldDraft } from "@/types/products";

interface CustomizationEditorProps {
  fields: CustomizationFieldDraft[];
  onChange: (fields: CustomizationFieldDraft[]) => void;
  // Lowest variant price, for the price preview.
  basePrice: number;
  disabled?: boolean;
}

const labelClass = "block text-sm font-medium";
const hintClass = "mt-0.5 text-xs text-muted";
const inputClass = "mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60";

const ASPECT_RATIOS: { value: string; label: string }[] = [
  { value: "", label: "Any shape" },
  { value: "1:1", label: "Square (1:1)" },
  { value: "4:5", label: "Portrait 4:5 (8×10 in)" },
  { value: "3:4", label: "Portrait 3:4" },
  { value: "2:3", label: "Portrait 2:3 (4×6 in)" },
  { value: "5:7", label: "Portrait 5:7" },
  { value: "1:1.41", label: "A-size portrait (A4/A3)" },
  { value: "5:4", label: "Landscape 5:4" },
  { value: "3:2", label: "Landscape 3:2" },
];

const PRICING_LABELS: Record<PricingRule["mode"], string> = {
  none: "No extra charge",
  flat: "Fixed add-on",
  per_char: "Per character",
  tiered: "By length (tiers)",
};

const newUid = () => `new-${crypto.randomUUID()}`;

/**
 * Personalisation fields: what the customer types (e.g. a name) or uploads
 * (a photo), and what it adds to the price.
 */
export function CustomizationEditor({ fields, onChange, basePrice, disabled }: CustomizationEditorProps) {
  const update = (uid: string, next: CustomizationFieldDraft) =>
    onChange(fields.map((field) => (field.uid === uid ? next : field)));

  const remove = (uid: string) => onChange(fields.filter((field) => field.uid !== uid));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = (type: "text" | "image") => {
    const label = type === "text" ? "Name" : "Your photo";
    const key = fieldKeyFromLabel(label, fields.map((field) => field.key));

    onChange([
      ...fields,
      type === "text"
        ? {
            uid: newUid(),
            key,
            label,
            type,
            required: true,
            helpText: null,
            config: { ...DEFAULT_TEXT_CONFIG },
            pricing: { mode: "none" },
          }
        : {
            uid: newUid(),
            key,
            label,
            type,
            required: true,
            helpText: null,
            config: { ...DEFAULT_IMAGE_CONFIG },
            pricing: { mode: "none" },
          },
    ]);
  };

  const canAdd = fields.length < MAX_CUSTOMIZATION_FIELDS;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-semibold">Personalisation</h3>
        <p className={hintClass}>
          For made-to-order products: let customers type a name or upload a photo. The price is the variant
          price plus any add-ons set here.
        </p>
      </div>

      {fields.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted">
          Regular product? Skip this. For a name keychain add a <span className="font-medium text-foreground">Text</span>{" "}
          field; for a photo frame add a <span className="font-medium text-foreground">Photo upload</span>.
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.uid} className="space-y-4 rounded-2xl border border-border p-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">
              {field.type === "text" ? <Type size={13} /> : <ImagePlus size={13} />}
              {field.type === "text" ? "Text" : "Photo upload"}
            </span>

            <div className="flex items-center gap-1">
              <IconButton label="Move up" onClick={() => move(index, -1)} disabled={disabled || index === 0}>
                <ArrowUp size={14} />
              </IconButton>
              <IconButton
                label="Move down"
                onClick={() => move(index, 1)}
                disabled={disabled || index === fields.length - 1}
              >
                <ArrowDown size={14} />
              </IconButton>
              <button
                type="button"
                onClick={() => remove(field.uid)}
                disabled={disabled}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:text-red-500"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>

          {/* Label + help */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor={`cf-label-${field.uid}`}>
                Label
              </label>
              <input
                id={`cf-label-${field.uid}`}
                value={field.label}
                maxLength={80}
                disabled={disabled}
                placeholder={field.type === "text" ? "e.g. Name on keychain" : "e.g. Your photo"}
                onChange={(e) => {
                  const label = e.target.value;
                  // New fields follow the label; saved fields keep their key
                  // (carts and orders refer to it).
                  const key = field.id
                    ? field.key
                    : fieldKeyFromLabel(
                        label || field.type,
                        fields.filter((f) => f.uid !== field.uid).map((f) => f.key)
                      );
                  update(field.uid, { ...field, label, key });
                }}
                className={`${inputClass} ${field.label.trim() ? "" : "border-amber-500"}`}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor={`cf-help-${field.uid}`}>
                Help text <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id={`cf-help-${field.uid}`}
                value={field.helpText ?? ""}
                maxLength={300}
                disabled={disabled}
                placeholder={field.type === "text" ? "e.g. Up to 12 letters" : "e.g. A clear, well-lit photo works best"}
                onChange={(e) => update(field.uid, { ...field, helpText: e.target.value || null })}
                className={inputClass}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={field.required}
              disabled={disabled}
              onChange={(e) => update(field.uid, { ...field, required: e.target.checked })}
              className="accent-[#003D29]"
            />
            Customer must fill this in
          </label>

          {field.type === "text" ? (
            <TextRules
              config={field.config}
              disabled={disabled}
              onChange={(config) => update(field.uid, { ...field, config })}
            />
          ) : (
            <ImageRules
              config={field.config}
              disabled={disabled}
              onChange={(config) => update(field.uid, { ...field, config })}
            />
          )}

          <PricingRules field={field} disabled={disabled} onChange={(pricing) => update(field.uid, { ...field, pricing })} />

          <PricePreview field={field} basePrice={basePrice} />

          <p className="text-[11px] text-muted">
            Saved as <code className="rounded bg-surface px-1">{field.key}</code>
          </p>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => add("text")}
          disabled={disabled || !canAdd}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50"
        >
          <Plus size={14} /> Text field
        </button>
        <button
          type="button"
          onClick={() => add("image")}
          disabled={disabled || !canAdd}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50"
        >
          <Plus size={14} /> Photo upload
        </button>
      </div>
    </section>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Text rules                                 */
/* -------------------------------------------------------------------------- */

function TextRules({
  config,
  onChange,
  disabled,
}: {
  config: TextFieldConfig;
  onChange: (config: TextFieldConfig) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<TextFieldConfig>) => onChange({ ...config, ...patch });

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">What can be typed</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Min characters</label>
          <input
            type="text"
            inputMode="numeric"
            value={showWholeNumber(config.minLength)}
            placeholder="0"
            disabled={disabled}
            onChange={(e) => set({ minLength: Math.min(parseWholeNumber(e.target.value) ?? 0, MAX_TEXT_LENGTH) })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Max characters</label>
          <input
            type="text"
            inputMode="numeric"
            value={showWholeNumber(config.maxLength)}
            placeholder="e.g. 12"
            disabled={disabled}
            onChange={(e) =>
              set({ maxLength: Math.min(parseWholeNumber(e.target.value) ?? 0, MAX_TEXT_LENGTH) })
            }
            className={`${inputClass} ${config.maxLength < 1 ? "border-amber-500" : ""}`}
          />
        </div>
      </div>
      <p className={hintClass}>Spaces don&apos;t count toward the length or the price.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Allowed characters</label>
          <select
            value={config.charset}
            disabled={disabled}
            onChange={(e) => set({ charset: e.target.value as TextCharset })}
            className={inputClass}
          >
            {(Object.keys(CHARSETS) as TextCharset[]).map((charset) => (
              <option key={charset} value={charset}>
                {CHARSETS[charset].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Placeholder</label>
          <input
            value={config.placeholder}
            maxLength={60}
            disabled={disabled}
            placeholder="e.g. ANNA"
            onChange={(e) => set({ placeholder: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.allowSpaces}
            disabled={disabled}
            onChange={(e) => set({ allowSpaces: e.target.checked })}
            className="accent-[#003D29]"
          />
          Allow spaces
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.uppercase}
            disabled={disabled}
            onChange={(e) => set({ uppercase: e.target.checked })}
            className="accent-[#003D29]"
          />
          Convert to CAPITALS
        </label>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Image rules                                */
/* -------------------------------------------------------------------------- */

function ImageRules({
  config,
  onChange,
  disabled,
}: {
  config: ImageFieldConfig;
  onChange: (config: ImageFieldConfig) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<ImageFieldConfig>) => onChange({ ...config, ...patch });

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Photo rules</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Max file size (MB)</label>
          <input
            type="text"
            inputMode="numeric"
            value={showWholeNumber(config.maxMB)}
            placeholder="10"
            disabled={disabled}
            onChange={(e) =>
              set({ maxMB: Math.min(Math.max(parseWholeNumber(e.target.value) ?? 0, 0), MAX_IMAGE_MB) })
            }
            className={inputClass}
          />
          <p className={hintClass}>Cloudinary&apos;s free plan allows up to 10 MB.</p>
        </div>

        <div>
          <label className={labelClass}>Frame shape</label>
          <select
            value={config.aspectRatio ?? ""}
            disabled={disabled}
            onChange={(e) => set({ aspectRatio: e.target.value || null })}
            className={inputClass}
          >
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio.value} value={ratio.value}>
                {ratio.label}
              </option>
            ))}
          </select>
          <p className={hintClass}>Shapes the preview the customer sees.</p>
        </div>
      </div>

      <div>
        <label className={labelClass}>Recommended minimum size (px)</label>
        <p className={hintClass}>
          Smaller photos still upload, with a &quot;may look blurry&quot; warning. A4 at 300 DPI ≈ 2480 × 3508.
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Minimum width"
            value={showWholeNumber(config.minWidth)}
            placeholder="Width"
            disabled={disabled}
            onChange={(e) => set({ minWidth: parseWholeNumber(e.target.value) })}
            className={`${inputClass} mt-0`}
          />
          <X size={14} className="shrink-0 text-muted" />
          <input
            type="text"
            inputMode="numeric"
            aria-label="Minimum height"
            value={showWholeNumber(config.minHeight)}
            placeholder="Height"
            disabled={disabled}
            onChange={(e) => set({ minHeight: parseWholeNumber(e.target.value) })}
            className={`${inputClass} mt-0`}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Pricing                                  */
/* -------------------------------------------------------------------------- */

function PricingRules({
  field,
  onChange,
  disabled,
}: {
  field: CustomizationFieldDraft;
  onChange: (pricing: PricingRule) => void;
  disabled?: boolean;
}) {
  const { pricing } = field;
  const modes: PricingRule["mode"][] =
    field.type === "text" ? ["none", "flat", "per_char", "tiered"] : ["none", "flat"];

  const maxLength = field.type === "text" ? field.config.maxLength : 0;

  const changeMode = (mode: PricingRule["mode"]) => {
    switch (mode) {
      case "flat":
        return onChange({ mode, amount: 0 });
      case "per_char":
        return onChange({ mode, rate: 0, freeChars: 0 });
      case "tiered":
        return onChange({
          mode,
          tiers: [
            { upTo: Math.max(1, Math.min(5, maxLength)), price: 0 },
            ...(maxLength > 5 ? [{ upTo: maxLength, price: 0 }] : []),
          ],
        });
      default:
        return onChange({ mode: "none" });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Extra charge</p>

      <select
        value={pricing.mode}
        disabled={disabled}
        onChange={(e) => changeMode(e.target.value as PricingRule["mode"])}
        className={inputClass}
      >
        {modes.map((mode) => (
          <option key={mode} value={mode}>
            {PRICING_LABELS[mode]}
          </option>
        ))}
      </select>

      {pricing.mode === "flat" && (
        <MoneyInput
          label={field.type === "image" ? "Add when a photo is uploaded (₹)" : "Add when filled in (₹)"}
          value={pricing.amount}
          disabled={disabled}
          onChange={(amount) => onChange({ ...pricing, amount })}
        />
      )}

      {pricing.mode === "per_char" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Characters included</label>
            <input
              type="text"
              inputMode="numeric"
              value={showWholeNumber(pricing.freeChars)}
              placeholder="0"
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...pricing, freeChars: Math.min(parseWholeNumber(e.target.value) ?? 0, MAX_TEXT_LENGTH) })
              }
              className={inputClass}
            />
            <p className={hintClass}>Covered by the base price.</p>
          </div>
          <MoneyInput
            label="Then per character (₹)"
            value={pricing.rate}
            disabled={disabled}
            onChange={(rate) => onChange({ ...pricing, rate })}
          />
        </div>
      )}

      {pricing.mode === "tiered" && (
        <TierEditor tiers={pricing.tiers} maxLength={maxLength} disabled={disabled} onChange={(tiers) => onChange({ mode: "tiered", tiers })} />
      )}
    </div>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={showWholeNumber(value)}
        placeholder="0"
        disabled={disabled}
        onChange={(e) => onChange(parseWholeNumber(e.target.value) ?? 0)}
        className={inputClass}
      />
    </div>
  );
}

function TierEditor({
  tiers,
  maxLength,
  onChange,
  disabled,
}: {
  tiers: { upTo: number; price: number }[];
  maxLength: number;
  onChange: (tiers: { upTo: number; price: number }[]) => void;
  disabled?: boolean;
}) {
  const set = (index: number, patch: Partial<{ upTo: number; price: number }>) =>
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));

  const last = tiers[tiers.length - 1];
  const gap = !last || last.upTo < maxLength;

  return (
    <div className="space-y-2">
      <p className={hintClass}>
        Each row: names up to this many characters cost this much extra. The last row must reach the max length
        ({maxLength}).
      </p>

      {tiers.map((tier, index) => {
        const from = index === 0 ? 1 : tiers[index - 1].upTo + 1;

        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="w-14 shrink-0 text-xs text-muted">{from} to</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label={`Tier ${index + 1} up to characters`}
              value={showWholeNumber(tier.upTo)}
              disabled={disabled}
              onChange={(e) => set(index, { upTo: Math.min(parseWholeNumber(e.target.value) ?? 0, MAX_TEXT_LENGTH) })}
              className="w-16 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
            />
            <span className="shrink-0 text-xs text-muted">chars: +₹</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label={`Tier ${index + 1} price`}
              value={showWholeNumber(tier.price)}
              placeholder="0"
              disabled={disabled}
              onChange={(e) => set(index, { price: parseWholeNumber(e.target.value) ?? 0 })}
              className="w-24 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
            />
            <IconButton
              label="Remove tier"
              onClick={() => onChange(tiers.filter((_, i) => i !== index))}
              disabled={disabled || tiers.length === 1}
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        );
      })}

      {gap && <p className="text-xs text-amber-600">Add a row that goes up to {maxLength} characters.</p>}

      <button
        type="button"
        disabled={disabled || tiers.length >= MAX_TIERS}
        onClick={() =>
          onChange([...tiers, { upTo: Math.min((last?.upTo ?? 0) + 3, Math.max(maxLength, 1)), price: last?.price ?? 0 }])
        }
        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface disabled:opacity-50"
      >
        <Plus size={13} /> Add tier
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Price preview                               */
/* -------------------------------------------------------------------------- */

const SAMPLE_NAMES = ["ANNA", "RAHUL", "ALEXANDRA"];

function PricePreview({ field, basePrice }: { field: CustomizationFieldDraft; basePrice: number }) {
  const [sample, setSample] = useState("");
  const summary = describePricing(field);

  if (field.type === "image") {
    const addOn = fieldPrice(field, "photo");
    return (
      <div className="rounded-xl bg-surface px-3 py-2 text-xs text-muted">
        {addOn > 0
          ? `Customer pays ${formatINR(basePrice)} + ${formatINR(addOn)} = ${formatINR(basePrice + addOn)} with a photo.`
          : "No extra charge for the photo."}
      </div>
    );
  }

  const samples = sample.trim() ? [sample] : SAMPLE_NAMES;

  return (
    <div className="space-y-2 rounded-xl bg-surface p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">Price preview</span>
        {summary && <span className="text-right text-muted">{summary}</span>}
      </div>

      <input
        value={sample}
        onChange={(e) => setSample(e.target.value)}
        placeholder="Try a name…"
        maxLength={MAX_TEXT_LENGTH * 2}
        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
      />

      <ul className="space-y-1">
        {samples.map((raw) => {
          const text = normalizeText(field.config, raw);
          const error = text ? textError(field, text) : null;
          const addOn = fieldPrice(field, text);

          return (
            <li key={raw} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium">
                {text || "—"} <span className="font-normal text-muted">({countChars(text)} chars)</span>
              </span>
              {error ? (
                <span className="shrink-0 text-amber-600">{error}</span>
              ) : (
                <span className="shrink-0 tabular-nums">
                  {formatINR(basePrice)} + {formatINR(addOn)} ={" "}
                  <span className="font-semibold">{formatINR(basePrice + addOn)}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
