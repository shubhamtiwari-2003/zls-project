import type { CustomizationField } from "@/lib/customization";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  image_url: string | null;
}

export interface ProductImage {
  id?: string;
  product_id?: string;
  url: string;
  cloudinary_public_id?: string | null;
  alt_text: string | null;
  order: number;
  is_primary: boolean;
  created_at?: string;
}


export interface Product {
  id?: string;
  sku: string | null;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price: number;
  weight_grams: number | null;
  width_mm: number | null;
  height_mm: number | null;
  length_mm: number | null;
  is_active: boolean;
  inventory_policy: string;
  status: "Active" | "Draft";
  images: ProductImage[];
  // Variants (edit form). Absent/empty options = one default variant.
  options?: ProductOptionDraft[];
  variants?: ProductVariantDraft[];
  // Personalisation fields (name, photo…). Empty = regular product.
  customizationFields?: CustomizationFieldDraft[];
}

// A customization field in the admin form. `uid` is a stable React key
// (the DB id, or a temporary one for new fields).
export type CustomizationFieldDraft = CustomizationField & { uid: string };

/*
  Admin form drafts for options and variants.

  `key` identifies a row before it has a database ID: existing rows use
  their ID, new rows a temporary "new-…" key. save_product() maps keys to
  IDs, so values can point at images and variants at values that are
  created in the same save.
*/

export interface ProductOptionValueDraft {
  key: string;
  id?: string;
  value: string;
  // Key of the product image this value shows (visual option only).
  imageKey: string | null;
}

export interface ProductOptionDraft {
  key: string;
  id?: string;
  name: string;
  // This option changes the product image (e.g. Design).
  isVisual: boolean;
  values: ProductOptionValueDraft[];
}

export interface ProductVariantDraft {
  id?: string;
  // One value key per option, in option order. Empty = default variant.
  valueKeys: string[];
  price: number;
  sku: string;
  isActive: boolean;
}