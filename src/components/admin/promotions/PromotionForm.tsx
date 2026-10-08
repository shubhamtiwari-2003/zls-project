"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, ImagePlus, Loader2, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { AnnouncementBar } from "@/components/promotions/AnnouncementBar";
import { ProductNotices } from "@/components/promotions/ProductNotices";
import {
  PLACEMENTS,
  TONES,
  toneClass,
  type NoticeTarget,
  type Placement,
  type Promotion,
  type PromoTone,
} from "@/lib/promotions";

/* One banner / message / popup / notice of a campaign. */

export interface ItemDraft {
  id?: string;
  placement: Placement;
  is_active: boolean;
  tag: string;
  title: string;
  body: string;
  cta_label: string;
  link_url: string;
  image_url: string | null;
  image_public_id: string | null;
  mobile_image_url: string | null;
  mobile_image_public_id: string | null;
  tone: PromoTone;
  target: NoticeTarget;
  category_ids: string[];
  product_ids: string[];
}

export const emptyItem = (placement: Placement): ItemDraft => ({
  placement,
  is_active: true,
  tag: "",
  title: "",
  body: "",
  cta_label: "",
  link_url: "",
  image_url: null,
  image_public_id: null,
  mobile_image_url: null,
  mobile_image_public_id: null,
  tone: placement === "announcement_bar" ? "festive" : "brand",
  target: "all",
  category_ids: [],
  product_ids: [],
});

export const toItemDraft = (item: Promotion): ItemDraft => ({
  id: item.id,
  placement: item.placement,
  is_active: item.is_active,
  tag: item.tag ?? "",
  title: item.title ?? "",
  body: item.body ?? "",
  cta_label: item.cta_label ?? "",
  link_url: item.link_url ?? "",
  image_url: item.image_url,
  image_public_id: item.image_public_id,
  mobile_image_url: item.mobile_image_url,
  mobile_image_public_id: item.mobile_image_public_id,
  tone: item.tone,
  target: item.target,
  category_ids: item.category_ids ?? [],
  product_ids: item.product_ids ?? [],
});

interface FieldText {
  label: string;
  placeholder: string;
  hint?: string;
  max: number;
}

interface PlacementFields {
  tag?: FieldText;
  title: FieldText & { required: boolean };
  body?: FieldText & { multiline?: boolean };
  cta: FieldText;
  image?: { label: string; hint: string; required: boolean };
  mobileImage?: { label: string; hint: string };
  tone: boolean;
  target: boolean;
}

const FIELDS: Record<Placement, PlacementFields> = {
  hero_banner: {
    tag: { label: "Small label", placeholder: "e.g. Diwali Special", max: 40 },
    title: {
      label: "Headline",
      placeholder: "e.g. Light up Diwali with personalised gifts",
      hint: "Leave empty if the image already has its text. The whole banner then links to the page below.",
      max: 120,
      required: false,
    },
    body: { label: "Subtext", placeholder: "e.g. Up to 30% off on name lamps and photo frames.", max: 200 },
    cta: { label: "Button text", placeholder: "e.g. Shop the sale", max: 30 },
    image: {
      label: "Banner image (desktop)",
      hint: "Wide, about 1920 × 800 px. Keep key content in the middle: the edges are cropped on smaller screens.",
      required: true,
    },
    mobileImage: { label: "Phone image (optional)", hint: "Portrait, about 1080 × 1300 px. Without it, the desktop image is cropped." },
    tone: false,
    target: false,
  },
  announcement_bar: {
    title: { label: "Message", placeholder: "e.g. 🪔 Diwali Sale is live!", max: 120, required: true },
    body: { label: "More text (optional)", placeholder: "e.g. Flat 20% off with code DIWALI20", max: 160 },
    cta: { label: "Link text (optional)", placeholder: "e.g. Shop now", max: 30 },
    tone: true,
    target: false,
  },
  popup: {
    tag: { label: "Small label", placeholder: "e.g. Festive offer", max: 40 },
    title: { label: "Heading", placeholder: "e.g. Get 20% off this Diwali", max: 120, required: true },
    body: { label: "Message", placeholder: "e.g. Use code DIWALI20 at checkout. Valid till 3 Nov.", max: 400, multiline: true },
    cta: { label: "Button text", placeholder: "e.g. Shop now", max: 30 },
    image: { label: "Image (optional)", hint: "Landscape 4:3, about 1200 × 900 px. Without an image, the popup uses the colour below.", required: false },
    tone: true,
    target: false,
  },
  product_notice: {
    tag: { label: "Label (optional)", placeholder: "e.g. Diwali", max: 40 },
    title: { label: "Notice", placeholder: "e.g. Order by 28 Oct for delivery before Diwali", max: 120, required: true },
    body: { label: "Details (optional)", placeholder: "e.g. Extra 10% off with code DIWALI10", max: 200 },
    cta: { label: "Link text (optional)", placeholder: "e.g. See all offers", max: 30 },
    tone: true,
    target: true,
  },
};

export const LINK_RE = /^(\/|https:\/\/)/;

function validate(draft: ItemDraft): string | null {
  const fields = FIELDS[draft.placement];
  const link = draft.link_url.trim();

  if (fields.image?.required && !draft.image_url) return "Upload the banner image.";
  if (fields.title.required && !draft.title.trim()) return `Enter the ${fields.title.label.toLowerCase()}.`;
  if (link && !LINK_RE.test(link)) return "Links start with / for a page on this site (e.g. /products), or https:// for another site.";
  if (draft.cta_label.trim() && !link) return "Add the link for the button.";
  if (draft.target === "categories" && draft.category_ids.length === 0) return "Pick at least one category.";
  if (draft.target === "products" && draft.product_ids.length === 0) return "Pick at least one product.";
  return null;
}

const blank = (text: string) => text.trim() || null;

/** The row as stored (empty text → null; unused fields cleared). */
function toRow(draft: ItemDraft) {
  const fields = FIELDS[draft.placement];
  return {
    placement: draft.placement,
    is_active: draft.is_active,
    tag: fields.tag ? blank(draft.tag) : null,
    title: blank(draft.title),
    body: fields.body ? blank(draft.body) : null,
    cta_label: blank(draft.cta_label),
    link_url: blank(draft.link_url),
    image_url: fields.image ? draft.image_url : null,
    image_public_id: fields.image ? draft.image_public_id : null,
    mobile_image_url: fields.mobileImage ? draft.mobile_image_url : null,
    mobile_image_public_id: fields.mobileImage ? draft.mobile_image_public_id : null,
    tone: draft.tone,
    target: fields.target ? draft.target : "all",
    category_ids: fields.target && draft.target === "categories" ? draft.category_ids : [],
    product_ids: fields.target && draft.target === "products" ? draft.product_ids : [],
  };
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10";
const labelClass = "block text-sm font-medium";
const hintClass = "mt-1 text-xs text-muted-foreground";

interface Props {
  campaignId: string;
  draft: ItemDraft;
  /** sort_order for a new item (end of the list). */
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

export function PromotionForm({ campaignId, draft: initial, nextSortOrder, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fields = FIELDS[draft.placement];
  const placement = PLACEMENTS.find((item) => item.value === draft.placement)!;

  const set = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const save = async () => {
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    const row = toRow(draft);
    const { error: saveError } = draft.id
      ? await supabase.from("promotions").update(row).eq("id", draft.id)
      : await supabase.from("promotions").insert({ ...row, campaign_id: campaignId, sort_order: nextSortOrder });
    setSaving(false);

    if (saveError) {
      console.log("Save promotion error:", saveError);
      setError(saveError.message);
      return;
    }

    onSaved();
  };

  // Live preview with the storefront's own components.
  const preview: Promotion = {
    ...toRow(draft),
    id: "preview",
    campaign_id: campaignId,
    sort_order: 0,
    title: draft.title.trim() || (fields.title.required ? fields.title.placeholder.replace(/^e\.g\. /, "") : null),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-form-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 id="promotion-form-title" className="text-lg font-semibold">
              {draft.id ? "Edit" : "Add"} · {placement.label}
            </h2>
            <p className="text-xs text-muted-foreground">{placement.description}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {/* Images */}
          {(fields.image || fields.mobileImage) && (
            <div className="grid gap-4 sm:grid-cols-[3fr_2fr]">
              {fields.image && (
                <ImageField
                  label={fields.image.label}
                  hint={fields.image.hint}
                  url={draft.image_url}
                  aspect={draft.placement === "hero_banner" ? "aspect-[12/5]" : "aspect-[4/3]"}
                  onChange={(url, publicId) => {
                    set("image_url", url);
                    set("image_public_id", publicId);
                  }}
                  onError={setError}
                />
              )}
              {fields.mobileImage && (
                <ImageField
                  label={fields.mobileImage.label}
                  hint={fields.mobileImage.hint}
                  url={draft.mobile_image_url}
                  aspect="aspect-[4/5] max-w-40"
                  onChange={(url, publicId) => {
                    set("mobile_image_url", url);
                    set("mobile_image_public_id", publicId);
                  }}
                  onError={setError}
                />
              )}
            </div>
          )}

          {fields.tag && (
            <TextField id="promo-tag" field={fields.tag} value={draft.tag} onChange={(value) => set("tag", value)} />
          )}
          <TextField id="promo-title" field={fields.title} value={draft.title} onChange={(value) => set("title", value)} />
          {fields.body && (
            <TextField
              id="promo-body"
              field={fields.body}
              multiline={fields.body.multiline}
              value={draft.body}
              onChange={(value) => set("body", value)}
            />
          )}

          {/* Link */}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="promo-cta" field={fields.cta} value={draft.cta_label} onChange={(value) => set("cta_label", value)} />
            <div>
              <label htmlFor="promo-link" className={labelClass}>
                Link
              </label>
              <input
                id="promo-link"
                value={draft.link_url}
                onChange={(event) => set("link_url", event.target.value.trim().slice(0, 500))}
                placeholder="/products/photo-frames"
                className={inputClass}
              />
              <p className={hintClass}>A page on this site (/products…) or https://…</p>
            </div>
          </div>

          {/* Colour */}
          {fields.tone && (
            <div>
              <span className={labelClass}>Colour</span>
              <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
                {TONES.map((tone) => (
                  <button
                    key={tone.value}
                    type="button"
                    role="radio"
                    aria-checked={draft.tone === tone.value}
                    onClick={() => set("tone", tone.value)}
                    className={`${tone.className} inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-offset-2 ring-offset-background transition ${
                      draft.tone === tone.value ? "ring-2 ring-foreground" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    {draft.tone === tone.value && <Check size={12} />}
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Where (product notices) */}
          {fields.target && <TargetPicker draft={draft} set={set} />}

          {/* Show / hide */}
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={draft.is_active} onChange={(event) => set("is_active", event.target.checked)} className="h-4 w-4" />
            Show this {draft.placement === "announcement_bar" ? "message" : "item"} while the campaign is live
          </label>

          {/* Preview */}
          <div>
            <p className={labelClass}>Preview</p>
            <div className="mt-2 overflow-hidden rounded-2xl border border-border">
              {draft.placement === "announcement_bar" && <AnnouncementBar messages={[preview]} />}
              {draft.placement === "product_notice" && (
                <div className="p-3">
                  <ProductNotices notices={[preview]} />
                </div>
              )}
              {draft.placement === "hero_banner" && <HeroPreview draft={draft} />}
              {draft.placement === "popup" && <PopupPreview draft={draft} preview={preview} />}
            </div>
          </div>

          {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {draft.id ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function TextField({
  id,
  field,
  value,
  onChange,
  multiline,
}: {
  id: string;
  field: FieldText;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const props = {
    id,
    value,
    placeholder: field.placeholder,
    maxLength: field.max,
    className: inputClass,
  };

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {field.label}
      </label>
      {multiline ? (
        <textarea {...props} rows={3} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input {...props} onChange={(event) => onChange(event.target.value)} />
      )}
      {field.hint && <p className={hintClass}>{field.hint}</p>}
    </div>
  );
}

function ImageField({
  label,
  hint,
  url,
  aspect,
  onChange,
  onError,
}: {
  label: string;
  hint: string;
  url: string | null;
  aspect: string;
  onChange: (url: string | null, publicId: string | null) => void;
  onError: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("Choose an image file (JPG, PNG or WebP).");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch("/api/cloudinary/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? "Upload failed.");
      onChange(result.url, result.public_id);
    } catch (uploadError) {
      onError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <label
        className={`relative mt-1.5 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/50 transition hover:border-foreground/40 ${aspect}`}
      >
        {url ? (
          <Image src={url} alt="" fill sizes="400px" className="object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 p-4 text-center text-xs text-muted-foreground">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            {uploading ? "Uploading…" : "Upload"}
          </span>
        )}
        {url && uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
            <Loader2 size={20} className="animate-spin" />
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            upload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      <div className="mt-1 flex items-start justify-between gap-2">
        <p className={hintClass}>{hint}</p>
        {url && (
          <button type="button" onClick={() => onChange(null, null)} className="mt-1 shrink-0 text-xs text-muted-foreground hover:text-danger">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function TargetPicker({
  draft,
  set,
}: {
  draft: ItemDraft;
  set: <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => void;
}) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("products").select("id, name").order("name").limit(1000),
    ]).then(([categoryResult, productResult]) => {
      if (cancelled) return;
      setCategories(categoryResult.data ?? []);
      setProducts(productResult.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (key: "category_ids" | "product_ids", id: string) => {
    const current = draft[key];
    set(key, current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const shownProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    // Selected first, then matches.
    return [...products]
      .filter((product) => !query || product.name.toLowerCase().includes(query))
      .sort((a, b) => Number(draft.product_ids.includes(b.id)) - Number(draft.product_ids.includes(a.id)));
  }, [products, search, draft.product_ids]);

  const options: { value: NoticeTarget; label: string }[] = [
    { value: "all", label: "All products" },
    { value: "categories", label: "Some categories" },
    { value: "products", label: "Some products" },
  ];

  return (
    <div>
      <span className={labelClass}>Show on</span>
      <div className="mt-2 inline-flex rounded-xl bg-muted p-1 text-sm">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => set("target", option.value)}
            aria-pressed={draft.target === option.value}
            className={`rounded-lg px-3 py-1.5 font-medium ${draft.target === option.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {draft.target === "categories" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.length === 0 && <p className="text-xs text-muted-foreground">Loading categories…</p>}
          {categories.map((category) => {
            const selected = draft.category_ids.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggle("category_ids", category.id)}
                aria-pressed={selected}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selected ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40"
                }`}
              >
                {selected && <Check size={12} />}
                {category.name}
              </button>
            );
          })}
        </div>
      )}

      {draft.target === "products" && (
        <div className="mt-3 rounded-2xl border border-border">
          <div className="relative border-b border-border">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${products.length} products`}
              className="w-full rounded-t-2xl bg-transparent py-2.5 pl-8 pr-3 text-sm outline-none"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto p-1">
            {shownProducts.map((product) => (
              <li key={product.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={draft.product_ids.includes(product.id)}
                    onChange={() => toggle("product_ids", product.id)}
                    className="h-4 w-4"
                  />
                  {product.name}
                </label>
              </li>
            ))}
            {shownProducts.length === 0 && <li className="px-2 py-1.5 text-xs text-muted-foreground">No products match.</li>}
          </ul>
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{draft.product_ids.length} selected</p>
        </div>
      )}
    </div>
  );
}

/** A small version of the homepage slide. */
function HeroPreview({ draft }: { draft: ItemDraft }) {
  if (!draft.image_url) {
    return <div className="flex aspect-[12/5] items-center justify-center bg-muted text-xs text-muted-foreground">Upload an image to preview</div>;
  }

  return (
    <div className="relative aspect-[12/5] w-full">
      <Image src={draft.image_url} alt="" fill sizes="640px" className="object-cover" />
      {draft.title.trim() && (
        <>
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 flex items-center px-6">
            <div className="max-w-[70%]">
              {draft.tag.trim() && <span className="mb-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white">{draft.tag}</span>}
              <p className="text-xl font-bold leading-tight text-white">{draft.title}</p>
              {draft.body.trim() && <p className="mt-1 line-clamp-2 text-xs text-white/80">{draft.body}</p>}
              {draft.cta_label.trim() && (
                <span className="mt-3 inline-block rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white">{draft.cta_label}</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PopupPreview({ draft, preview }: { draft: ItemDraft; preview: Promotion }) {
  return (
    <div className="flex justify-center bg-black/50 p-4">
      <div className="w-full max-w-72 overflow-hidden rounded-2xl bg-background text-left">
        {draft.image_url ? (
          <div className="relative aspect-[4/3]">
            <Image src={draft.image_url} alt="" fill sizes="288px" className="object-cover" />
          </div>
        ) : (
          <div className={`${toneClass(draft.tone)} px-4 pb-4 pt-6`}>
            {draft.tag.trim() && <p className="text-[10px] font-semibold uppercase tracking-wider opacity-90">{draft.tag}</p>}
            <p className="text-lg font-bold leading-tight">{preview.title}</p>
          </div>
        )}
        <div className="p-4">
          {draft.image_url && <p className="text-base font-bold leading-tight">{preview.title}</p>}
          {draft.body.trim() && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{draft.body}</p>}
          {draft.cta_label.trim() && (
            <span className="mt-3 block rounded-full bg-brand py-2 text-center text-xs font-semibold text-white">{draft.cta_label}</span>
          )}
        </div>
      </div>
    </div>
  );
}
