"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ExternalLink, FolderTree, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { refreshStorefront } from "@/lib/refresh-storefront";
import { slugify } from "@/lib/slugify";

/*
  Admin → Categories. Name, link, photo, order and badge of each category.
  The order is used in the header menu, the filters and the homepage
  "Shop by category" carousel.
*/

type BadgeMode = "auto" | "new" | "none";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  image_url: string | null;
  image_public_id: string | null;
  sort_order: number;
  badge_mode: BadgeMode;
  products: { count: number }[];
}

const SELECT = "id, name, slug, description, is_active, image_url, image_public_id, sort_order, badge_mode, products(count)";

const BADGES: { value: BadgeMode; label: string; hint: string }[] = [
  { value: "auto", label: "Automatic", hint: "“New Launch” while a product added in the last 30 days is in it" },
  { value: "new", label: "Always “New Launch”", hint: "For a category you're promoting" },
  { value: "none", label: "No badge", hint: "" },
];

const productCount = (category: Category) => category.products?.[0]?.count ?? 0;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10";
const labelClass = "block text-sm font-medium";
const hintClass = "mt-1 text-xs text-muted-foreground";

function Switch({ on, onClick, disabled, label }: { on: boolean; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${on ? "bg-success" : "bg-zinc-400"}`}
      aria-label={label}
      aria-pressed={on}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select(SELECT)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.log("Categories load error:", error);
      setLoadError(
        /sort_order|badge_mode|image_public_id/.test(error.message)
          ? "Run the categories migration (20261001160000_categories_admin.sql) in Supabase first."
          : error.message
      );
      return;
    }

    setLoadError("");
    setCategories((data ?? []) as Category[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    load();
  }, [load]);

  const run = async (id: string, action: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(id);
    const { error } = await action();
    setBusy(null);
    if (error) setNotice(error.message);
    refreshStorefront();
    load();
  };

  const toggle = (category: Category) =>
    run(category.id, () => supabase.from("categories").update({ is_active: !category.is_active }).eq("id", category.id));

  const remove = (category: Category) => {
    if (!window.confirm(`Delete the category “${category.name}”? This can't be undone.`)) return;
    run(category.id, () => supabase.from("categories").delete().eq("id", category.id));
  };

  // Swap with the neighbour, then number the list 0, 1, 2…
  const move = (index: number, direction: -1 | 1) => {
    if (!categories) return;
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;

    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setCategories(reordered);

    run(categories[index].id, async () => {
      const results = await Promise.all(
        reordered.map((category, position) =>
          category.sort_order === position ? null : supabase.from("categories").update({ sort_order: position }).eq("id", category.id)
        )
      );
      return { error: results.find((result) => result?.error)?.error ?? null };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="mt-1 text-muted-foreground">
            Shown in this order in the header menu, the filters and the homepage “Shop by category”.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          disabled={!categories}
          className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-50"
        >
          <Plus size={16} /> New category
        </button>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {loadError ? (
        <p className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">{loadError}</p>
      ) : !categories ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading categories…
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <FolderTree className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No categories yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create one, e.g. “Lamps”, then pick it when adding products.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {categories.map((category, index) => {
              const count = productCount(category);
              const badge = BADGES.find((item) => item.value === category.badge_mode);

              return (
                <li key={category.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5 ${category.is_active ? "" : "opacity-60"}`}>
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
                      {category.image_url ? (
                        <Image src={category.image_url} alt="" fill sizes="64px" className="object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] leading-tight text-muted-foreground">
                          Product photo
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{category.name}</span>
                        {!category.is_active && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">Hidden</span>}
                        {category.badge_mode === "new" && (
                          <span className="rounded-full bg-brand-bright/10 px-2.5 py-0.5 text-xs font-medium text-brand-bright">New Launch</span>
                        )}
                      </div>
                      <a
                        href={`/products/${category.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                      >
                        /products/{category.slug} <ExternalLink size={11} />
                      </a>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {count} product{count === 1 ? "" : "s"} · Badge: {badge?.label ?? "Automatic"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || busy !== null}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                      aria-label={`Move ${category.name} up`}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === categories.length - 1 || busy !== null}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                      aria-label={`Move ${category.name} down`}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <Switch
                      on={category.is_active}
                      onClick={() => toggle(category)}
                      disabled={busy === category.id}
                      label={category.is_active ? `Hide ${category.name}` : `Show ${category.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => setEditing(category)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${category.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(category)}
                      disabled={count > 0 || busy === category.id}
                      title={count > 0 ? "Move or delete its products first" : undefined}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                      aria-label={count > 0 ? `${category.name} has products and can't be deleted` : `Delete ${category.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {editing && categories && (
        <CategoryForm
          category={editing === "new" ? null : editing}
          nextSortOrder={Math.max(-1, ...categories.map((category) => category.sort_order)) + 1}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refreshStorefront();
            load();
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CategoryForm({
  category,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  category: Category | null;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  // New categories: the link follows the name until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [description, setDescription] = useState(category?.description ?? "");
  const [image, setImage] = useState<{ url: string; publicId: string | null } | null>(
    category?.image_url ? { url: category.image_url, publicId: category.image_public_id } : null
  );
  const [badge, setBadge] = useState<BadgeMode>(category?.badge_mode ?? "auto");
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch("/api/cloudinary/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? "Upload failed.");
      setImage({ url: result.url, publicId: result.public_id });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const cleanSlug = slugify(slug);
    if (!name.trim()) return setError("Enter a name.");
    if (!cleanSlug) return setError("Enter the link name (letters and numbers).");

    const row = {
      name: name.trim(),
      slug: cleanSlug,
      description: description.trim() || null,
      image_url: image?.url ?? null,
      image_public_id: image?.publicId ?? null,
      badge_mode: badge,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    const { error: saveError } = category
      ? await supabase.from("categories").update(row).eq("id", category.id)
      : await supabase.from("categories").insert({ ...row, sort_order: nextSortOrder });
    setSaving(false);

    if (saveError) {
      console.log("Save category error:", saveError);
      setError(saveError.code === "23505" ? `Another category already uses the link /products/${cleanSlug}.` : saveError.message);
      return;
    }

    onSaved();
  };

  const slugChanged = category && slugify(slug) !== category.slug;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="category-form-title" className="text-lg font-semibold">
            {category ? `Edit ${category.name}` : "New category"}
          </h2>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {/* Photo */}
          <div className="flex gap-4">
            <label className="relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/50 transition hover:border-foreground/40">
              {image ? (
                <Image src={image.url} alt="" fill sizes="112px" className="object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
                  {uploading ? "Uploading…" : "Upload"}
                </span>
              )}
              {image && uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                  <Loader2 size={20} className="animate-spin" />
                </span>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => {
                  upload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <div className="min-w-0 text-sm">
              <p className="font-medium">Photo</p>
              <p className={hintClass}>
                Square, about 800 × 800 px. Without a photo, the homepage uses the newest product&apos;s photo.
              </p>
              {image && (
                <button type="button" onClick={() => setImage(null)} className="mt-2 text-xs text-muted-foreground hover:text-danger">
                  Remove photo
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="category-name" className={labelClass}>
              Name
            </label>
            <input
              id="category-name"
              value={name}
              maxLength={60}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugTouched) setSlug(slugify(event.target.value));
                setError(null);
              }}
              placeholder="e.g. Table Lamps"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="category-slug" className={labelClass}>
              Link
            </label>
            <div className="mt-1.5 flex items-center rounded-xl border border-border bg-background text-sm focus-within:ring-2 focus-within:ring-foreground/10">
              <span className="pl-3 text-muted-foreground">/products/</span>
              <input
                id="category-slug"
                value={slug}
                maxLength={60}
                onChange={(event) => {
                  setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                  setSlugTouched(true);
                  setError(null);
                }}
                onBlur={() => setSlug(slugify(slug))}
                className="w-full rounded-r-xl bg-transparent py-2.5 pr-3 font-mono outline-none"
              />
            </div>
            {slugChanged ? (
              <p className="mt-1 text-xs text-warning">Old links to /products/{category.slug} (shared or in search results) will stop working.</p>
            ) : (
              <p className={hintClass}>Lowercase letters, numbers and dashes.</p>
            )}
          </div>

          <div>
            <label htmlFor="category-description" className={labelClass}>
              Description (optional)
            </label>
            <textarea
              id="category-description"
              value={description}
              maxLength={300}
              rows={2}
              onChange={(event) => setDescription(event.target.value)}
              className={inputClass}
            />
          </div>

          <fieldset>
            <legend className={labelClass}>Homepage badge</legend>
            <div className="mt-2 space-y-2">
              {BADGES.map((option) => (
                <label key={option.value} className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="radio"
                    name="category-badge"
                    checked={badge === option.value}
                    onChange={() => setBadge(option.value)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    {option.label}
                    {option.hint && <span className="block text-xs text-muted-foreground">{option.hint}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4" />
            Show on the site (hidden categories and their pages are not shown to customers)
          </label>

          {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || uploading}
            className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {category ? "Save" : "Create category"}
          </button>
        </div>
      </div>
    </div>
  );
}
