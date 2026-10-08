"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, Plus, Trash2, X } from "lucide-react";
import { parseWholeNumber, showWholeNumber } from "@/lib/number-input";
import type {
  ProductOptionDraft,
  ProductOptionValueDraft,
  ProductVariantDraft,
} from "@/types/products";

export const MAX_OPTIONS = 3;

const newKey = () => `new-${crypto.randomUUID()}`;

interface VariantsEditorProps {
  options: ProductOptionDraft[];
  variants: ProductVariantDraft[];
  onChange: (options: ProductOptionDraft[], variants: ProductVariantDraft[]) => void;
  // The product's images, for picking each design's image.
  images: { key: string; url: string; isBlob: boolean }[];
  // Price for newly generated variants.
  defaultPrice: number;
  // The product's SKU; the first variant takes it when options are added.
  defaultSku: string;
  disabled?: boolean;
}

const sameValues = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

/**
 * One variant per combination of option values. Existing variants keep
 * their ID, price, SKU and active flag; new combinations get defaultPrice.
 *
 * Switching between "no options" and "options", the first variant and the
 * single default variant are the same row: it keeps its ID (so its stock
 * and order history carry over) and the product's SKU.
 */
export function buildVariants(
  options: ProductOptionDraft[],
  previous: ProductVariantDraft[],
  defaultPrice: number,
  defaultSku = ""
): ProductVariantDraft[] {
  const usable = options.filter((option) => option.values.length > 0);

  if (usable.length === 0) {
    // Back to a single default variant (the former first variant).
    const existing = previous.find((variant) => variant.valueKeys.length === 0) ?? previous[0];
    return [
      {
        id: existing?.id,
        valueKeys: [],
        price: existing?.price || defaultPrice,
        sku: existing?.sku || defaultSku,
        isActive: true,
      },
    ];
  }

  let combos: string[][] = [[]];
  for (const option of usable) {
    combos = combos.flatMap((combo) => option.values.map((value) => [...combo, value.key]));
  }

  const next = combos.map(
    (valueKeys): ProductVariantDraft =>
      previous.find((variant) => sameValues(variant.valueKeys, valueKeys)) ?? {
        valueKeys,
        price: defaultPrice,
        sku: "",
        isActive: true,
      }
  ).map((variant, index) => ({ ...variant, valueKeys: combos[index] }));

  // First options added (no option variants before): the default variant
  // becomes the first variant.
  const formerDefault = previous.find((variant) => variant.valueKeys.length === 0);
  const firstOptionsAdded = previous.every((variant) => variant.valueKeys.length === 0);

  if (firstOptionsAdded && next.length > 0) {
    next[0] = {
      ...next[0],
      id: formerDefault?.id,
      price: formerDefault?.price || defaultPrice,
      sku: formerDefault?.sku || defaultSku,
    };
  }

  return next;
}

// Common option names, offered as one-click suggestions.
const NAME_SUGGESTIONS = ["Size", "Design", "Colour", "Frame"];

// Example values shown as placeholders for well-known option names.
const VALUE_EXAMPLES: Record<string, string> = {
  size: "e.g. A4, A3",
  design: "e.g. Batman, Spiderman",
  colour: "e.g. Black, White",
  color: "e.g. Black, White",
  frame: "e.g. No frame, Black frame",
};

const labelClass = "block text-sm font-medium";
const hintClass = "mt-0.5 text-xs text-muted-foreground";

export function VariantsEditor({
  options,
  variants,
  onChange,
  images,
  defaultPrice,
  defaultSku,
  disabled,
}: VariantsEditorProps) {
  // Text being typed into each option's "add value" box.
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [bulkPrice, setBulkPrice] = useState("");

  const valueByKey = new Map(
    options.flatMap((option) => option.values.map((value) => [value.key, value] as const))
  );

  const commitOptions = (next: ProductOptionDraft[]) =>
    onChange(next, buildVariants(next, variants, defaultPrice, defaultSku));

  const updateOption = (key: string, patch: Partial<ProductOptionDraft>) =>
    commitOptions(options.map((option) => (option.key === key ? { ...option, ...patch } : option)));

  const addOption = (name = "") =>
    commitOptions([
      ...options,
      {
        key: newKey(),
        name,
        // Designs and colours usually look different; sizes don't.
        isVisual:
          ["design", "colour", "color"].includes(name.toLowerCase()) &&
          options.every((option) => !option.isVisual),
        values: [],
      },
    ]);

  const removeOption = (key: string) => commitOptions(options.filter((option) => option.key !== key));

  const setVisual = (key: string, isVisual: boolean) =>
    commitOptions(
      options.map((option) => ({
        ...option,
        // Only one option changes the image.
        isVisual: option.key === key ? isVisual : isVisual ? false : option.isVisual,
      }))
    );

  const addValue = (option: ProductOptionDraft) => {
    // Allow pasting "A4, A3, A2" in one go.
    const parts = (newValues[option.key] ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (!parts.length) return;

    const existing = new Set(option.values.map((value) => value.value.toLowerCase()));
    const added: ProductOptionValueDraft[] = [];

    for (const text of parts) {
      if (existing.has(text.toLowerCase())) continue;
      existing.add(text.toLowerCase());
      added.push({ key: newKey(), value: text, imageKey: null });
    }

    if (added.length) updateOption(option.key, { values: [...option.values, ...added] });
    setNewValues((current) => ({ ...current, [option.key]: "" }));
  };

  const removeValue = (option: ProductOptionDraft, valueKey: string) =>
    updateOption(option.key, { values: option.values.filter((value) => value.key !== valueKey) });

  const setValueImage = (option: ProductOptionDraft, valueKey: string, imageKey: string | null) =>
    // Images don't change the variant list, so skip rebuilding it.
    onChange(
      options.map((o) =>
        o.key === option.key
          ? { ...o, values: o.values.map((v) => (v.key === valueKey ? { ...v, imageKey } : v)) }
          : o
      ),
      variants
    );

  const updateVariant = (index: number, patch: Partial<ProductVariantDraft>) =>
    onChange(
      options,
      variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant))
    );

  const applyBulkPrice = () => {
    const price = parseWholeNumber(bulkPrice);
    if (!price) return;
    onChange(options, variants.map((variant) => ({ ...variant, price })));
    setBulkPrice("");
  };

  const imageByKey = new Map(images.map((image) => [image.key, image]));

  const variantLabel = (variant: ProductVariantDraft) =>
    variant.valueKeys.map((key) => valueByKey.get(key)?.value ?? "?").join(" · ");

  const variantImage = (variant: ProductVariantDraft) => {
    const imageKey = variant.valueKeys.map((key) => valueByKey.get(key)?.imageKey).find(Boolean);
    return (imageKey && imageByKey.get(imageKey)) || images[0] || null;
  };

  const hasOptions = options.length > 0;
  const usedNames = new Set(options.map((option) => option.name.trim().toLowerCase()));
  const tableReady =
    hasOptions && options.every((option) => option.values.length > 0) && variants.length > 0;
  const enabledCount = variants.filter((variant) => variant.isActive).length;

  return (
    <section className="space-y-4">
      {/* Header + explanation */}
      <div>
        <h3 className="font-semibold">Variants</h3>
        <p className={hintClass}>
          Sell one product in different versions — like a poster in A4 and A3, or in several designs.
        </p>
      </div>

      {!hasOptions && (
        <div className="space-y-3 rounded-2xl border border-dashed border-border p-4">
          <div className="text-sm">
            <p className="font-medium">Does this product come in different versions?</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">No</span> → skip this. The Price and SKU above are
                used.
              </li>
              <li>
                <span className="font-medium text-foreground">Yes</span> → add an option (what the customer
                chooses), then its values. Example: option <em>Size</em> with values <em>A4, A3</em>.
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Add an option:</span>
            {NAME_SUGGESTIONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addOption(name)}
                disabled={disabled}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface disabled:opacity-50"
              >
                + {name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addOption()}
              disabled={disabled}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface disabled:opacity-50"
            >
              + Other…
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: options */}
      {hasOptions && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Step 1 · What can the customer choose?
          </p>

          {options.map((option, optionIndex) => {
            const nameMissing = !option.name.trim();
            const placeholder = VALUE_EXAMPLES[option.name.trim().toLowerCase()] ?? "e.g. Small, Large";

            return (
              <div key={option.key} className="space-y-4 rounded-2xl border border-border p-4">
                {/* Option name */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={`option-${option.key}`} className={labelClass}>
                      Option {optionIndex + 1} name
                    </label>
                    <button
                      type="button"
                      onClick={() => removeOption(option.key)}
                      disabled={disabled}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-danger"
                    >
                      <Trash2 size={14} />
                      Remove option
                    </button>
                  </div>
                  <p className={hintClass}>What the customer picks, shown above the buttons on the product page.</p>
                  <input
                    id={`option-${option.key}`}
                    value={option.name}
                    onChange={(e) => updateOption(option.key, { name: e.target.value })}
                    placeholder="e.g. Size"
                    maxLength={50}
                    disabled={disabled}
                    className={`mt-2 w-full rounded-xl border bg-surface px-4 py-2.5 text-sm ${
                      nameMissing ? "border-warning" : "border-border"
                    }`}
                  />
                  {nameMissing && <p className="mt-1 text-xs text-warning">Give this option a name.</p>}
                </div>

                {/* Values */}
                <div>
                  <label htmlFor={`values-${option.key}`} className={labelClass}>
                    {option.name.trim() || "Option"} values
                  </label>
                  <p className={hintClass}>
                    Each value becomes a button the customer can pick. Press Enter after each one, or separate
                    with commas.
                  </p>

                  <div
                    className={`mt-2 flex flex-wrap items-center gap-2 rounded-xl border p-2 ${
                      option.values.length === 0 ? "border-warning" : "border-border"
                    }`}
                  >
                    {option.values.map((value) => (
                      <span
                        key={value.key}
                        className="flex items-center gap-1 rounded-full bg-foreground py-1 pl-3 pr-1 text-sm text-background"
                      >
                        {value.value}
                        <button
                          type="button"
                          onClick={() => removeValue(option, value.key)}
                          disabled={disabled}
                          className="rounded-full p-1 hover:bg-background/20"
                          aria-label={`Remove ${value.value}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}

                    <input
                      id={`values-${option.key}`}
                      value={newValues[option.key] ?? ""}
                      onChange={(e) => setNewValues((current) => ({ ...current, [option.key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addValue(option);
                        }
                      }}
                      onBlur={() => addValue(option)}
                      placeholder={option.values.length ? "Add another…" : placeholder}
                      maxLength={120}
                      disabled={disabled}
                      className="min-w-40 flex-1 bg-transparent px-2 py-1 text-sm outline-none"
                    />
                  </div>
                  {option.values.length === 0 && (
                    <p className="mt-1 text-xs text-warning">Add at least one value.</p>
                  )}
                </div>

                {/* Different photo per value */}
                <div className="rounded-xl bg-surface p-3">
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={option.isVisual}
                      onChange={(e) => setVisual(option.key, e.target.checked)}
                      disabled={disabled}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Show a different photo for each value</span>
                      <span className="block text-xs text-muted-foreground">
                        Turn on when the values look different (designs, colours). Leave off for sizes. Only one
                        option can do this.
                      </span>
                    </span>
                  </label>

                  {option.isVisual && option.values.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {images.length === 0 ? (
                        <p className="text-xs text-warning">
                          Upload product images in the Images section first, then pick one for each value here.
                        </p>
                      ) : (
                        option.values.map((value) => (
                          <div key={value.key}>
                            <p className="mb-1.5 text-xs">
                              Photo shown when the customer picks{" "}
                              <span className="font-semibold">{value.value}</span>
                              {!value.imageKey && <span className="text-muted-foreground"> — none yet (shows the cover)</span>}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {images.map((image, imageIndex) => {
                                const selected = value.imageKey === image.key;
                                return (
                                  <button
                                    key={image.key}
                                    type="button"
                                    onClick={() => setValueImage(option, value.key, selected ? null : image.key)}
                                    disabled={disabled}
                                    title={selected ? "Click again to clear" : `Use image ${imageIndex + 1}`}
                                    className={`relative h-14 w-14 overflow-hidden rounded-lg border-2 ${
                                      selected ? "border-foreground ring-2 ring-foreground/20" : "border-border opacity-60 hover:opacity-100"
                                    }`}
                                    aria-pressed={selected}
                                    aria-label={`Use image ${imageIndex + 1} for ${value.value}`}
                                  >
                                    <Image src={image.url} alt="" fill sizes="56px" unoptimized={image.isBlob} className="object-cover" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {options.length < MAX_OPTIONS && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Add another option:</span>
              {NAME_SUGGESTIONS.filter((name) => !usedNames.has(name.toLowerCase())).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addOption(name)}
                  disabled={disabled}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface disabled:opacity-50"
                >
                  + {name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => addOption()}
                disabled={disabled}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface disabled:opacity-50"
              >
                <Plus size={12} />
                Other…
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: variants */}
      {tableReady && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Step 2 · Price each version
            </p>
            <p className={hintClass}>
              {variants.length} combinations · {enabledCount} for sale. Untick the ones you don&apos;t sell.
              New versions start with 1 in stock — set real stock in the Inventory tab after saving.
              The first version&apos;s SKU is used as the product&apos;s main SKU in the admin.
            </p>
          </div>

          <div className="rounded-2xl border border-border">
            {/* Same price for all */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
              <label htmlFor="bulk-price" className="text-xs font-medium">
                Same price for all:
              </label>
              <input
                id="bulk-price"
                type="text"
                inputMode="numeric"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(showWholeNumber(parseWholeNumber(e.target.value)))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyBulkPrice();
                  }
                }}
                disabled={disabled}
                placeholder="₹"
                className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={applyBulkPrice}
                disabled={disabled || !bulkPrice}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50"
              >
                Apply to all
              </button>
            </div>

            {/* Column headers */}
            <div className="hidden grid-cols-[2rem_2.5rem_1fr_6rem_6rem_8rem] gap-3 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
              <span>Sell</span>
              <span />
              <span>Version</span>
              <span>Price (₹)</span>
              <span title="Original price, shown struck through">MRP (₹)</span>
              <span>SKU (optional)</span>
            </div>

            <div className="divide-y divide-border">
              {variants.map((variant, index) => {
                const image = variantImage(variant);
                const label = variantLabel(variant);
                const priceMissing = variant.isActive && (!variant.price || variant.price <= 0);
                const mrpTooLow =
                  variant.isActive && !!variant.compareAtPrice && variant.compareAtPrice <= variant.price;

                return (
                  <div
                    key={variant.valueKeys.join("|")}
                    className={`grid grid-cols-[2rem_2.5rem_1fr] items-center gap-3 p-3 sm:grid-cols-[2rem_2.5rem_1fr_6rem_6rem_8rem] ${
                      variant.isActive ? "" : "opacity-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={variant.isActive}
                      onChange={(e) => updateVariant(index, { isActive: e.target.checked })}
                      disabled={disabled}
                      aria-label={`Sell ${label}`}
                      title={variant.isActive ? "For sale — untick to hide" : "Not sold — tick to sell"}
                    />

                    <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-border bg-background">
                      {image ? (
                        <Image src={image.url} alt="" fill sizes="40px" unoptimized={image.isBlob} className="object-cover" />
                      ) : (
                        <ImageIcon size={16} className="m-auto mt-3 text-muted-foreground" />
                      )}
                    </div>

                    <span className="text-sm font-medium">{label}</span>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={showWholeNumber(variant.price)}
                      onChange={(e) => updateVariant(index, { price: parseWholeNumber(e.target.value) ?? 0 })}
                      disabled={disabled || !variant.isActive}
                      placeholder="Price"
                      aria-label={`Price for ${label}`}
                      className={`col-start-3 rounded-lg border bg-surface px-2 py-1.5 text-sm sm:col-start-auto ${
                        priceMissing ? "border-danger" : "border-border"
                      }`}
                    />

                    <input
                      type="text"
                      inputMode="numeric"
                      value={showWholeNumber(variant.compareAtPrice)}
                      onChange={(e) => updateVariant(index, { compareAtPrice: parseWholeNumber(e.target.value) })}
                      disabled={disabled || !variant.isActive}
                      placeholder="MRP"
                      aria-label={`MRP for ${label}`}
                      title="Original price, shown struck through. Leave empty for no discount."
                      className={`col-start-3 rounded-lg border bg-surface px-2 py-1.5 text-sm sm:col-start-auto ${
                        mrpTooLow ? "border-danger" : "border-border"
                      }`}
                    />

                    <input
                      value={variant.sku}
                      onChange={(e) => updateVariant(index, { sku: e.target.value })}
                      disabled={disabled || !variant.isActive}
                      placeholder="e.g. ZLS-BAT-A3"
                      aria-label={`SKU for ${label}`}
                      className="col-start-3 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm sm:col-start-auto"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Problems to fix before saving, or null. */
export function validateVariants(
  options: ProductOptionDraft[],
  variants: ProductVariantDraft[]
): string | null {
  const names = new Set<string>();

  for (const option of options) {
    const name = option.name.trim();
    if (!name) return "Every option needs a name (e.g. Size).";
    if (names.has(name.toLowerCase())) return `Option "${name}" is listed twice.`;
    names.add(name.toLowerCase());
    if (option.values.length === 0) return `Add at least one value to "${name}".`;
  }

  if (options.length === 0) return null;

  const active = variants.filter((variant) => variant.isActive);
  if (active.length === 0) return "At least one variant must be enabled.";
  if (active.some((variant) => !variant.price || variant.price <= 0)) {
    return "Every enabled variant needs a price above 0.";
  }
  if (active.some((variant) => variant.compareAtPrice && variant.compareAtPrice <= variant.price)) {
    return "A variant's MRP must be higher than its price (or left empty).";
  }

  const skus = active.map((variant) => variant.sku.trim()).filter(Boolean);
  if (new Set(skus).size !== skus.length) return "Two variants have the same SKU.";

  return null;
}
