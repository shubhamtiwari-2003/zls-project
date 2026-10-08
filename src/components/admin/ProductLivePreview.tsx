"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, ShoppingBag } from "lucide-react";
import { formatINR } from "@/lib/shop-config";
import type { ProductOptionDraft, ProductVariantDraft } from "@/types/products";

interface PreviewImage {
  key: string;
  url: string;
  isBlob: boolean;
}

interface ProductLivePreviewProps {
  name: string;
  description: string | null;
  status: string;
  isActive: boolean;
  images: PreviewImage[];
  options: ProductOptionDraft[];
  variants: ProductVariantDraft[];
  // Price used when the product has no options.
  price: number;
}

/**
 * How the product will look in the store, updating as the form changes:
 * the product page (with clickable option buttons) and the product card.
 */
export function ProductLivePreview({
  name,
  description,
  status,
  isActive,
  images,
  options,
  variants,
  price,
}: ProductLivePreviewProps) {
  // optionKey → chosen valueKey (falls back to the first value).
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [view, setView] = useState<"page" | "card">("page");

  const usable = options.filter((option) => option.values.length > 0);
  const hasOptions = usable.length > 0;

  const selection = Object.fromEntries(
    usable.map((option) => {
      const picked = option.values.some((value) => value.key === chosen[option.key])
        ? chosen[option.key]
        : option.values[0].key;
      return [option.key, picked];
    })
  );

  const selectedKeys = Object.values(selection);

  const variant = hasOptions
    ? variants.find(
        (v) => v.valueKeys.length === selectedKeys.length && selectedKeys.every((key) => v.valueKeys.includes(key))
      )
    : null;

  const sold = hasOptions ? Boolean(variant?.isActive) : true;
  const displayPrice = hasOptions ? variant?.price ?? 0 : price;

  // Image: the chosen value's photo (visual option), else the cover.
  const imageByKey = new Map(images.map((image) => [image.key, image]));
  const visualOption = usable.find((option) => option.isVisual);
  const visualValue = visualOption?.values.find((value) => value.key === selection[visualOption.key]);
  const image = (visualValue?.imageKey && imageByKey.get(visualValue.imageKey)) || images[0] || null;

  const activePrices = hasOptions
    ? variants.filter((v) => v.isActive && v.price > 0).map((v) => v.price)
    : [price];
  const lowestPrice = activePrices.length ? Math.min(...activePrices) : 0;

  // A value is "available" if some enabled version has it with the other choices.
  const valueAvailable = (optionKey: string, valueKey: string) => {
    const others = Object.entries(selection)
      .filter(([key]) => key !== optionKey)
      .map(([, value]) => value);
    return variants.some(
      (v) => v.isActive && v.valueKeys.includes(valueKey) && others.every((key) => v.valueKeys.includes(key))
    );
  };

  const productImage = (shown: PreviewImage | null, sizes: string) =>
    shown ? (
      <Image src={shown.url} alt={name || "Product preview"} fill sizes={sizes} unoptimized={shown.isBlob} className="object-cover" />
    ) : (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
        <ImageIcon size={20} />
        Upload images to preview
      </div>
    );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Live preview</h3>
          <p className="text-xs text-muted-foreground">How customers will see it. Click the options to try them.</p>
        </div>

        <div className="flex rounded-full bg-surface p-1 text-xs font-medium">
          {(["page", "card"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`rounded-full px-3 py-1 transition ${view === mode ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              {mode === "page" ? "Product page" : "Product card"}
            </button>
          ))}
        </div>
      </div>

      {!isActive || status === "Draft" ? (
        <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning ">
          Not visible in the store yet — {status === "Draft" ? "status is Draft" : "product is unpublished"}.
        </p>
      ) : null}

      {view === "page" ? (
        <div className="overflow-hidden rounded-3xl border border-border bg-background">
          <div className="relative aspect-square bg-surface">{productImage(image, "400px")}</div>

          <div className="space-y-4 p-5">
            <div>
              <h4 className="text-xl font-bold">{name || "Product name"}</h4>
              <p className="mt-2 text-2xl font-black">
                {displayPrice > 0 ? formatINR(displayPrice) : <span className="text-base text-muted-foreground">Set a price</span>}
              </p>
              {hasOptions && variant?.sku && <p className="text-xs text-muted-foreground">SKU {variant.sku}</p>}
            </div>

            {usable.map((option) => {
              const picked = option.values.find((value) => value.key === selection[option.key]);

              return (
                <div key={option.key}>
                  <p className="text-sm font-semibold">
                    {option.name.trim() || "Option"}
                    {picked && <span className="font-normal text-muted-foreground">: {picked.value}</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {option.values.map((value) => {
                      const active = selection[option.key] === value.key;
                      const available = valueAvailable(option.key, value.key);

                      return (
                        <button
                          key={value.key}
                          type="button"
                          onClick={() => setChosen((current) => ({ ...current, [option.key]: value.key }))}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            active ? "border-foreground bg-foreground text-background" : "border-border"
                          } ${!available && !active ? "text-muted-foreground line-through" : ""}`}
                        >
                          {value.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              disabled
              className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold ${
                sold ? "bg-brand text-white" : "bg-border text-muted-foreground"
              }`}
            >
              <ShoppingBag size={16} />
              {sold ? "Add to cart" : "This combination isn't sold"}
            </button>

            {description && <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-60 overflow-hidden rounded-3xl border border-border bg-surface">
          <div className="relative aspect-[4/5] bg-background">{productImage(images[0] ?? null, "240px")}</div>
          <div className="space-y-2 p-4">
            <h4 className="line-clamp-2 font-semibold">{name || "Product name"}</h4>
            <p className="line-clamp-2 text-xs text-muted-foreground">{description || "Description"}</p>
            <div>
              <p className="text-xs text-muted-foreground">{hasOptions && activePrices.length > 1 ? "Starting from" : "Price"}</p>
              <p className="text-2xl font-bold">{lowestPrice > 0 ? formatINR(lowestPrice) : "—"}</p>
            </div>
            <div className="rounded-full border border-brand py-2 text-center text-xs font-semibold">
              {hasOptions && variants.filter((v) => v.isActive).length > 1 ? "Choose options" : "Add to Cart"}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
