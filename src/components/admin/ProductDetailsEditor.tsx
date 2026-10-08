"use client";

import { Plus, Trash2 } from "lucide-react";
import { parseWholeNumber } from "@/lib/number-input";
import { DETAIL_LIMITS, type ProductDetails } from "@/lib/product-details";

interface ProductDetailsEditorProps {
  details: ProductDetails;
  onChange: (details: ProductDetails) => void;
  disabled?: boolean;
}

const labelClass = "block text-sm font-medium";
const hintClass = "mt-0.5 text-xs text-muted-foreground";
// No width here: each field sets its own (a shared w-full overrode the
// narrow quantity box and pushed the delete buttons out of the row).
const inputClass = "rounded-xl border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60";

function RemoveButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-40"
    >
      <Trash2 size={16} />
    </button>
  );
}

function AddButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50"
    >
      <Plus size={14} /> {children}
    </button>
  );
}

/** "What's in the box" (required), highlights, specifications, care. */
export function ProductDetailsEditor({ details, onChange, disabled }: ProductDetailsEditorProps) {
  const set = <K extends keyof ProductDetails>(key: K, value: ProductDetails[K]) =>
    onChange({ ...details, [key]: value });

  const included = details.includedItems;
  const missingIncluded = !included.some((item) => item.name.trim());

  return (
    <section className="space-y-6">
      <div>
        <h3 className="font-semibold">Product details</h3>
        <p className={hintClass}>Shown on the product page under the description.</p>
      </div>

      {/* What's in the box */}
      <div>
        <p className={labelClass}>
          What&apos;s in the box <span className="text-danger">*</span>
        </p>
        <p className={hintClass}>Every item the customer receives, with quantity. At least one is required.</p>

        <div className="mt-2 space-y-2">
          {included.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={item.qty ? String(item.qty) : ""}
                onChange={(e) =>
                  set(
                    "includedItems",
                    included.map((it, i) =>
                      i === index ? { ...it, qty: Math.min(parseWholeNumber(e.target.value) ?? 0, DETAIL_LIMITS.maxQty) } : it
                    )
                  )
                }
                disabled={disabled}
                aria-label={`Quantity of item ${index + 1}`}
                className={`${inputClass} w-16 shrink-0 px-2 text-center ${item.name.trim() && !item.qty ? "border-danger" : ""}`}
                placeholder="Qty"
              />
              <span className="text-sm text-muted-foreground">×</span>
              <input
                value={item.name}
                onChange={(e) =>
                  set(
                    "includedItems",
                    included.map((it, i) => (i === index ? { ...it, name: e.target.value.slice(0, DETAIL_LIMITS.text) } : it))
                  )
                }
                disabled={disabled}
                aria-label={`Item ${index + 1}`}
                placeholder={index === 0 ? "e.g. Shoji Lamp" : "e.g. USB-C cable"}
                className={`${inputClass} min-w-0 flex-1`}
              />
              <RemoveButton
                onClick={() => set("includedItems", included.filter((_, i) => i !== index))}
                label={`Remove item ${index + 1}`}
                disabled={disabled}
              />
            </div>
          ))}
        </div>

        {missingIncluded && (
          <p className="mt-2 text-xs text-warning">Add at least one item, e.g. &quot;1 × Lamp&quot;.</p>
        )}

        <div className="mt-2">
          <AddButton
            onClick={() => set("includedItems", [...included, { name: "", qty: 1 }])}
            disabled={disabled || included.length >= DETAIL_LIMITS.includedItems}
          >
            Add item
          </AddButton>
        </div>
      </div>

      {/* Highlights */}
      <div>
        <p className={labelClass}>
          Highlights <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
        <p className={hintClass}>Short selling points, shown as a bullet list.</p>

        <div className="mt-2 space-y-2">
          {details.highlights.map((highlight, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={highlight}
                onChange={(e) =>
                  set(
                    "highlights",
                    details.highlights.map((h, i) => (i === index ? e.target.value.slice(0, DETAIL_LIMITS.text) : h))
                  )
                }
                disabled={disabled}
                aria-label={`Highlight ${index + 1}`}
                placeholder="e.g. Hand-finished, made to order"
                className={`${inputClass} min-w-0 flex-1`}
              />
              <RemoveButton
                onClick={() => set("highlights", details.highlights.filter((_, i) => i !== index))}
                label={`Remove highlight ${index + 1}`}
                disabled={disabled}
              />
            </div>
          ))}
        </div>

        <div className="mt-2">
          <AddButton
            onClick={() => set("highlights", [...details.highlights, ""])}
            disabled={disabled || details.highlights.length >= DETAIL_LIMITS.highlights}
          >
            Add highlight
          </AddButton>
        </div>
      </div>

      {/* Specifications */}
      <div>
        <p className={labelClass}>
          Specifications <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
        <p className={hintClass}>
          Name and value, e.g. Material: PLA+. Size and weight from &quot;Dimensions &amp; Weight&quot; are added
          automatically.
        </p>

        <div className="mt-2 space-y-2">
          {details.specifications.map((spec, index) => {
            const incomplete = Boolean(spec.label.trim()) !== Boolean(spec.value.trim());

            return (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={spec.label}
                  onChange={(e) =>
                    set(
                      "specifications",
                      details.specifications.map((s, i) => (i === index ? { ...s, label: e.target.value.slice(0, DETAIL_LIMITS.text) } : s))
                    )
                  }
                  disabled={disabled}
                  aria-label={`Specification ${index + 1} name`}
                  placeholder="e.g. Material"
                  className={`${inputClass} min-w-0 basis-2/5 ${incomplete && !spec.label.trim() ? "border-warning" : ""}`}
                />
                <input
                  value={spec.value}
                  onChange={(e) =>
                    set(
                      "specifications",
                      details.specifications.map((s, i) => (i === index ? { ...s, value: e.target.value.slice(0, DETAIL_LIMITS.text) } : s))
                    )
                  }
                  disabled={disabled}
                  aria-label={`Specification ${index + 1} value`}
                  placeholder="e.g. PLA+"
                  className={`${inputClass} min-w-0 flex-1 ${incomplete && !spec.value.trim() ? "border-warning" : ""}`}
                />
                <RemoveButton
                  onClick={() => set("specifications", details.specifications.filter((_, i) => i !== index))}
                  label={`Remove specification ${index + 1}`}
                  disabled={disabled}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-2">
          <AddButton
            onClick={() => set("specifications", [...details.specifications, { label: "", value: "" }])}
            disabled={disabled || details.specifications.length >= DETAIL_LIMITS.specifications}
          >
            Add specification
          </AddButton>
        </div>
      </div>

      {/* Care */}
      <div>
        <label htmlFor="care-instructions" className={labelClass}>
          Care instructions <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="care-instructions"
          rows={3}
          value={details.careInstructions}
          onChange={(e) => set("careInstructions", e.target.value.slice(0, DETAIL_LIMITS.careInstructions))}
          disabled={disabled}
          placeholder="e.g. Wipe with a dry, soft cloth. Keep away from direct sunlight and heat."
          className={`${inputClass} mt-2 w-full py-3`}
        />
      </div>
    </section>
  );
}
