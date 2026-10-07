"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ProductGallery } from "@/features/products/components/ProductGallery";
import { ProductPurchasePanel } from "@/features/products/components/ProductPurchasePanel";
import {
  CustomizationForm,
  customizationInputId,
} from "@/features/products/components/CustomizationForm";
import type { UploadedPhoto } from "@/features/products/lib/uploadCustomerPhoto";
import { formatINR } from "@/lib/shop-config";
import { BUSINESS } from "@/lib/business";
import {
  checkCustomization,
  customizationPrice,
  type CustomizationDisplay,
  type CustomizationValues,
} from "@/lib/customization";
import type { ProductDetail, ProductVariantDetail } from "@/lib/products.server";

interface ProductDetailViewProps {
  product: ProductDetail;
  // From ?variant= in the URL (shared links open that exact variant).
  initialVariantId: string | null;
  // Server-rendered content under the buy box (highlights, description, specs).
  children?: ReactNode;
}

// optionId → selected valueId
type Selection = Record<string, string>;

function selectionOf(product: ProductDetail, variant: ProductVariantDetail): Selection {
  const selection: Selection = {};
  product.options.forEach((option, index) => {
    const valueId = variant.valueIds[index];
    if (valueId) selection[option.id] = valueId;
  });
  return selection;
}

const matches = (variant: ProductVariantDetail, selection: Selection) =>
  Object.values(selection).every((valueId) => variant.valueIds.includes(valueId));

const inStock = (variant: ProductVariantDetail) => variant.stock === null || variant.stock > 0;

export function ProductDetailView({ product, initialVariantId, children }: ProductDetailViewProps) {
  const { options, variants, images, customizationFields } = product;

  // Personalisation (name, photo…): raw values as entered, uploaded photos,
  // photos still uploading, and whether to show errors yet.
  const [customValues, setCustomValues] = useState<CustomizationValues>({});
  const [uploads, setUploads] = useState<Record<string, UploadedPhoto>>({});
  const [uploadingKeys, setUploadingKeys] = useState<string[]>([]);
  const [showCustomErrors, setShowCustomErrors] = useState(false);

  // Start with the variant from the URL, else the first one in stock.
  const initialVariant =
    variants.find((variant) => variant.id === initialVariantId) ??
    variants.find(inStock) ??
    variants[0];

  const [selection, setSelection] = useState<Selection>(() => selectionOf(product, initialVariant));

  const imageIndexByUrl = useMemo(
    () => new Map(images.map((image, index) => [image.url, index])),
    [images]
  );

  const [imageIndex, setImageIndex] = useState(() =>
    initialVariant.imageUrl ? imageIndexByUrl.get(initialVariant.imageUrl) ?? 0 : 0
  );

  // Exact match for the current selection (null = combination not sold).
  const variant =
    options.length === 0
      ? variants[0]
      : variants.find(
          (v) => v.valueIds.length === options.length && matches(v, selection)
        ) ?? null;

  const selectVariant = (next: ProductVariantDetail) => {
    setSelection(selectionOf(product, next));

    if (next.imageUrl && imageIndexByUrl.has(next.imageUrl)) {
      setImageIndex(imageIndexByUrl.get(next.imageUrl)!);
    }

    // Shareable URL without a navigation.
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next.id);
    window.history.replaceState(null, "", url);
  };

  const chooseValue = (optionId: string, valueId: string) => {
    const wanted = { ...selection, [optionId]: valueId };

    // Keep the other choices if that combination exists; otherwise switch
    // to a variant with this value (preferring one in stock).
    const candidates = variants.filter((v) => v.valueIds.includes(valueId));
    const next =
      candidates.find((v) => matches(v, wanted) && inStock(v)) ??
      candidates.find((v) => matches(v, wanted)) ??
      candidates.find(inStock) ??
      candidates[0];

    if (next) selectVariant(next);
  };

  // Clicking a design's image in the gallery selects that design.
  const handleImageSelect = (index: number) => {
    setImageIndex(index);

    const url = images[index]?.url;
    const visualOption = options.find((option) => option.isVisual);
    const value = visualOption?.values.find((v) => v.imageUrl === url);

    if (visualOption && value && selection[visualOption.id] !== value.id) {
      chooseValue(visualOption.id, value.id);
      setImageIndex(index);
    }
  };

  // For each value: is any variant with it (and the other current choices) in stock?
  const valueState = (optionId: string, valueId: string) => {
    const others = Object.fromEntries(Object.entries(selection).filter(([id]) => id !== optionId));
    const combos = variants.filter((v) => v.valueIds.includes(valueId) && matches(v, others));

    if (combos.length === 0) return "unavailable";
    return combos.some(inStock) ? "available" : "soldout";
  };

  const href = `/products/${product.category.slug}/${product.slug}`;

  // Same checks and pricing as the server (which has the final say).
  const customCheck = checkCustomization(customizationFields, customValues);
  const addOn = customizationPrice(customizationFields, customCheck.values);
  const displayPrice = (variant?.price ?? product.price) + addOn;

  const customDisplay: CustomizationDisplay[] = customizationFields
    .filter((field) => customCheck.values[field.key])
    .map((field) => {
      const value = customCheck.values[field.key];
      return field.type === "image"
        ? { key: field.key, label: field.label, value: "Photo uploaded", imageUrl: uploads[value]?.previewUrl ?? null }
        : { key: field.key, label: field.label, value };
    });

  // Called by Add to cart / Buy now: shows errors and moves to the first one.
  const validateCustomization = () => {
    setShowCustomErrors(true);

    if (uploadingKeys.length) {
      document.getElementById(customizationInputId(uploadingKeys[0]))?.scrollIntoView({ block: "center" });
      return false;
    }

    const firstError = customizationFields.find((field) => customCheck.errors[field.key]);

    if (firstError) {
      const input = document.getElementById(customizationInputId(firstError.key));
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus({ preventScroll: true });
      return false;
    }

    return true;
  };

  return (
    <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 xl:gap-12 [&>*]:min-w-0">
      {/* LEFT: gallery */}
      <ProductGallery images={images} name={product.name} selected={imageIndex} onSelect={handleImageSelect} />

      {/* RIGHT: details */}
      <div className="flex flex-col">
        <Link
          href={`/products/${product.category.slug}`}
          className="w-fit rounded-full bg-surface px-3 py-1 text-xs font-medium hover:underline"
        >
          {product.category.name}
        </Link>

        <h1 className="mt-3 text-2xl font-bold text-foreground sm:mt-4 sm:text-4xl">{product.name}</h1>

        <p className="mt-4 text-3xl font-black sm:mt-6 sm:text-4xl">{formatINR(displayPrice)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {BUSINESS.gstRegistered ? "Inclusive of all taxes" : "Final price · no hidden charges"}
          {addOn > 0 && <span> · includes {formatINR(addOn)} personalisation</span>}
          {variant?.sku && <span> · SKU {variant.sku}</span>}
        </p>

        {/* Option pickers */}
        {options.length > 0 && (
          <div className="mt-8 space-y-6">
            {options.map((option) => {
              const selectedValue = option.values.find((v) => v.id === selection[option.id]);

              return (
                <fieldset key={option.id}>
                  <legend className="text-sm font-semibold">
                    {option.name}
                    {selectedValue && <span className="font-normal text-muted-foreground">: {selectedValue.value}</span>}
                  </legend>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {option.values.map((value) => {
                      const state = valueState(option.id, value.id);
                      const active = selection[option.id] === value.id;

                      return (
                        <button
                          key={value.id}
                          type="button"
                          onClick={() => chooseValue(option.id, value.id)}
                          aria-pressed={active}
                          title={state === "soldout" ? "Sold out" : state === "unavailable" ? "Not available with your other choices" : undefined}
                          className={`relative rounded-full border px-4 py-2 text-sm font-medium transition ${
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border hover:border-foreground/50"
                          } ${state !== "available" && !active ? "text-muted-foreground line-through decoration-1" : ""}`}
                        >
                          {value.value}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        )}

        <CustomizationForm
          fields={customizationFields}
          values={customValues}
          onChange={(key, value) => setCustomValues((current) => ({ ...current, [key]: value }))}
          uploads={uploads}
          onUploaded={(key, photo) => {
            setUploads((current) => ({ ...current, [photo.id]: photo }));
            setCustomValues((current) => ({ ...current, [key]: photo.id }));
          }}
          onUploadingChange={(key, uploading) =>
            setUploadingKeys((current) =>
              uploading ? [...current.filter((k) => k !== key), key] : current.filter((k) => k !== key)
            )
          }
          errors={customCheck.errors}
          showErrors={showCustomErrors}
        />

        <ProductPurchasePanel
          key={variant?.id ?? "none"}
          product={{ id: product.id, name: product.name }}
          customization={
            customizationFields.length
              ? {
                  values: customCheck.values,
                  display: customDisplay,
                  validate: validateCustomization,
                }
              : undefined
          }
          variant={
            variant
              ? {
                  id: variant.id,
                  title: variant.title,
                  price: variant.price + addOn,
                  image: variant.imageUrl ?? images[0]?.url ?? "",
                  href: `${href}?variant=${variant.id}`,
                  stock: variant.stock,
                }
              : null
          }
        />

        {children}
      </div>
    </div>
  );
}
