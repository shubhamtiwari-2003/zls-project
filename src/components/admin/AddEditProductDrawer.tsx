"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
  GripVertical,
  UploadCloud,
  X,
  Trash2,
  ImageIcon,
  Loader2,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { refreshStorefront } from "@/lib/refresh-storefront";
import { slugify } from "@/lib/slugify";
import { parseWholeNumber, showWholeNumber } from "@/lib/number-input";

/* =========================================================
   TYPES
========================================================= */
import type {
  Product,
  ProductImage,
  Category,
  ProductOptionDraft,
  ProductVariantDraft,
  CustomizationFieldDraft,
} from "@/types/products";
import { VariantsEditor, validateVariants } from "@/components/admin/VariantsEditor";
import { CustomizationEditor } from "@/components/admin/CustomizationEditor";
import { ProductDetailsEditor } from "@/components/admin/ProductDetailsEditor";
import {
  EMPTY_DETAILS,
  productDetailsPayload,
  validateProductDetails,
  type ProductDetails,
} from "@/lib/product-details";
import { validateCustomizationFields } from "@/lib/customization";
import { ProductLivePreview } from "@/components/admin/ProductLivePreview";


/*
  File is only present for newly selected images.

  Existing image:
    {
      id,
      url,
      cloudinary_public_id
    }

  New image:
    {
      file,
      url: blob URL
    }
*/
interface PreviewImage extends ProductImage {
  file?: File;
  // Stable reference for option values: the DB id for existing images,
  // a temporary "new-…" key for images not saved yet.
  key: string;
}


interface Props {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

/* =========================================================
   EMPTY FORM
========================================================= */

const emptyForm: Product = {
  name: "",
  slug: "",
  description: "",
  category_id: "",

  status: "Active",

  weight_grams: null,
  length_mm: null,
  height_mm: null,
  width_mm: null,

  price: 0,

  sku: "",

  is_active: true,

  inventory_policy: "deny",

  images: [],
};

/* =========================================================
   SORTABLE IMAGE ITEM
========================================================= */

interface SortableImageProps {
  image: PreviewImage;
  index: number;
  onRemove: () => void;
}

function SortableImage({
  image,
  index,
  onRemove,
}: SortableImageProps) {
  const sortableId =
    image.id ??
    `new-${image.url}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const isCover = index === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group
        flex
        items-center
        gap-3
        rounded-xl
        border
        border-border
        bg-surface
        p-3
        transition
        ${isDragging
          ? "shadow-xl ring-2 ring-foreground/20"
          : ""
        }
      `}
    >
      {/* Drag Handle */}

      <button
        type="button"
        {...attributes}
        {...listeners}
        className="
          flex
          shrink-0
          cursor-grab
          touch-none
          items-center
          justify-center
          rounded-lg
          p-2
          text-muted-foreground
          hover:bg-surface-secondary
          hover:text-foreground
          active:cursor-grabbing
        "
        aria-label="Drag image"
      >
        <GripVertical size={20} />
      </button>

      {/* Image */}

      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
        <Image
          src={image.url}
          alt={
            image.alt_text ??
            `Product image ${index + 1}`
          }
          fill
          unoptimized={image.url.startsWith("blob:")}
          className="object-cover"
        />

        {isCover && (
          <div className="absolute left-1.5 top-1.5 rounded-full bg-black/75 px-2 py-1 text-[10px] font-medium text-white">
            Cover
          </div>
        )}
      </div>

      {/* Information */}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">
            {isCover
              ? "Cover Image"
              : `Image ${index + 1}`}
          </p>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          Order: {index}
        </p>

        {image.file && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            New image
          </p>
        )}
      </div>

      {/* Delete */}

      <button
        type="button"
        onClick={onRemove}
        className="
          shrink-0
          rounded-lg
          p-2
          text-muted-foreground
          transition
          hover:bg-danger/10
          hover:text-danger
        "
        aria-label="Remove image"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function AddEditProductDrawer({
  open,
  onClose,
  product,
}: Props) {
  /* -------------------------------------------------------
     FORM
  ------------------------------------------------------- */

  const [form, setForm] =
    useState<Product>(emptyForm);

  /* -------------------------------------------------------
     IMAGES

     IMPORTANT:

     previewImages[0] = COVER
     previewImages[1] = order 1
     previewImages[2] = order 2
     ...
  ------------------------------------------------------- */

  const [previewImages, setPreviewImages] =
    useState<PreviewImage[]>([]);

  /* -------------------------------------------------------
     VARIANTS (options + one variant per combination)
  ------------------------------------------------------- */

  const [options, setOptions] =
    useState<ProductOptionDraft[]>([]);

  const [variants, setVariants] =
    useState<ProductVariantDraft[]>([]);

  /* -------------------------------------------------------
     PERSONALISATION (name, photo…)
  ------------------------------------------------------- */

  const [customizationFields, setCustomizationFields] =
    useState<CustomizationFieldDraft[]>([]);

  /* -------------------------------------------------------
     PRODUCT DETAILS (what's in the box, highlights, specs, care)
     New products start with one empty "What's in the box" row.
  ------------------------------------------------------- */

  const [details, setDetails] =
    useState<ProductDetails>({ ...EMPTY_DETAILS, includedItems: [{ name: "", qty: 1 }] });

  /* -------------------------------------------------------
     CATEGORIES
  ------------------------------------------------------- */

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [categoriesLoading, setCategoriesLoading] =
    useState(true);

  /* -------------------------------------------------------
     SAVE STATE
  ------------------------------------------------------- */

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  /* -------------------------------------------------------
     DND SENSOR

     Activation distance prevents accidental dragging when
     clicking buttons.
  ------------------------------------------------------- */

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  /* =======================================================
     FETCH CATEGORIES
  ======================================================= */

  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);

      const { data, error } =
        await supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          });

      if (error) {
        console.log(
          "Error fetching categories:",
          {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }
        );

        setCategories([]);
      } else {
        setCategories(data ?? []);
      }

      setCategoriesLoading(false);
    };

    fetchCategories();
  }, []);

  /* =======================================================
     PREFILL FORM
  ======================================================= */

  useEffect(() => {
    if (!open) return;

    setError(null);
    setSuccess(null);

    if (product) {
      /* ---------------------------------------------------
         EDIT MODE
      --------------------------------------------------- */

      setForm({
        ...product,
        inventory_policy:
          product.inventory_policy ??
          "deny",
      });

      /*
        Always sort existing images by DB order.
      */

      const sortedImages = [
        ...(product.images ?? []),
      ]
        .sort(
          (a, b) =>
            (a.order ?? 0) -
            (b.order ?? 0)
        )
        .map((image, index) => ({
          ...image,
          key: image.id ?? `new-${crypto.randomUUID()}`,
          order: index,
          is_primary: index === 0,
        }));

      setPreviewImages(sortedImages);
      setOptions(product.options ?? []);
      setVariants(product.variants ?? []);
      setCustomizationFields(product.customizationFields ?? []);
      setDetails(
        product.details && product.details.includedItems.length
          ? product.details
          : { ...(product.details ?? EMPTY_DETAILS), includedItems: [{ name: "", qty: 1 }] }
      );
    } else {
      /* ---------------------------------------------------
         ADD MODE
      --------------------------------------------------- */

      setForm({
        ...emptyForm,
        images: [],
      });

      setPreviewImages([]);
      setOptions([]);
      setVariants([]);
      setCustomizationFields([]);
      setDetails({ ...EMPTY_DETAILS, includedItems: [{ name: "", qty: 1 }] });
    }
  }, [product, open]);

  /* =======================================================
     FORM UPDATE
  ======================================================= */

  const update = <
    K extends keyof Product
  >(
    key: K,
    value: Product[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /* =======================================================
     NORMALIZE IMAGE ORDER
  ======================================================= */

  const normalizeImages = (
    images: PreviewImage[]
  ): PreviewImage[] => {
    return images.map(
      (image, index) => ({
        ...image,
        order: index,
        is_primary: index === 0,
      })
    );
  };

  /* =======================================================
     IMAGE UPLOAD SELECTION
  ======================================================= */

  const handleImages = (
    files: FileList | null
  ) => {
    if (!files) return;

    const selectedFiles = Array.from(files);

    if (!selectedFiles.length) {
      return;
    }

    const newImages: PreviewImage[] =
      selectedFiles.map((file) => ({
        url: URL.createObjectURL(file),

        cloudinary_public_id: null,

        alt_text: file.name,

        order: 0,

        is_primary: false,

        file,

        key: `new-${crypto.randomUUID()}`,
      }));

    setPreviewImages((current) => {
      return normalizeImages([
        ...current,
        ...newImages,
      ]);
    });
  };

  /* =======================================================
     REMOVE IMAGE
  ======================================================= */

  const removeImage = (
    index: number
  ) => {
    const target = previewImages[index];

    /*
      Warn if a variant uses this image (e.g. Design: Batman);
      those values fall back to the product cover.
    */

    const usedBy = options.flatMap((option) =>
      option.values
        .filter((value) => target && value.imageKey === target.key)
        .map((value) => `${option.name || "Option"}: ${value.value}`)
    );

    if (usedBy.length) {
      const ok = window.confirm(
        `This image is used by ${usedBy.join(", ")}. Remove it anyway?`
      );
      if (!ok) return;

      setOptions((current) =>
        current.map((option) => ({
          ...option,
          values: option.values.map((value) =>
            value.imageKey === target.key ? { ...value, imageKey: null } : value
          ),
        }))
      );
    }

    setPreviewImages((current) => {
      const imageToRemove =
        current[index];

      /*
        Revoke blob URL for newly uploaded
        local preview.
      */

      if (
        imageToRemove?.file &&
        imageToRemove.url.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          imageToRemove.url
        );
      }

      const updated =
        current.filter(
          (_, i) => i !== index
        );

      return normalizeImages(updated);
    });
  };

  /* =======================================================
     DRAG END
  ======================================================= */

  const handleDragEnd = (
    event: DragEndEvent
  ) => {
    const {
      active,
      over,
    } = event;

    if (!over) {
      return;
    }

    if (
      active.id === over.id
    ) {
      return;
    }

    setPreviewImages((current) => {
      const oldIndex =
        current.findIndex(
          (image) =>
            (image.id ??
              `new-${image.url}`) ===
            active.id
        );

      const newIndex =
        current.findIndex(
          (image) =>
            (image.id ??
              `new-${image.url}`) ===
            over.id
        );

      if (
        oldIndex === -1 ||
        newIndex === -1
      ) {
        return current;
      }

      const reordered =
        arrayMove(
          current,
          oldIndex,
          newIndex
        );

      return normalizeImages(
        reordered
      );
    });
  };

  /* =======================================================
     IMAGE IDS FOR DND
  ======================================================= */

  const imageIds = useMemo(
    () =>
      previewImages.map(
        (image) =>
          image.id ??
          `new-${image.url}`
      ),
    [previewImages]
  );

  /* =======================================================
     CLOUDINARY UPLOAD
  ======================================================= */

  const uploadImageToCloudinary =
    async (
      file: File
    ) => {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/cloudinary/upload",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "Image upload failed."
        );
      }

      return result;
    };

  /* =======================================================
     CLOUDINARY DELETE
  ======================================================= */

  const deleteImageFromCloudinary =
    async (
      publicId: string
    ) => {
      try {
        const response =
          await fetch(
            "/api/cloudinary/delete",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                public_id:
                  publicId,
              }),
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          console.log(
            "Cloudinary cleanup failed:",
            result
          );
        }

        return result;
      } catch (error) {
        console.log(
          "Cloudinary cleanup error:",
          error
        );
      }
    };

  /* =======================================================
     DELETE MULTIPLE CLOUDINARY IMAGES
  ======================================================= */

  const cleanupCloudinaryImages =
    async (
      publicIds: string[]
    ) => {
      const uniqueIds =
        Array.from(
          new Set(
            publicIds.filter(
              Boolean
            )
          )
        );

      await Promise.allSettled(
        uniqueIds.map(
          (publicId) =>
            deleteImageFromCloudinary(
              publicId
            )
        )
      );
    };

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave = async () => {
    if (saving) return;

    setError(null);
    setSuccess(null);

    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    if (!form.name.trim()) {
      setError(
        "Product name is required."
      );
      return;
    }

    if (!form.category_id) {
      setError(
        "Please select a category."
      );
      return;
    }

    const hasOptions = options.length > 0;

    if (
      !hasOptions &&
      (!form.price || form.price <= 0)
    ) {
      setError(
        "Please enter a valid price."
      );
      return;
    }

    const variantsError = validateVariants(options, variants);

    if (variantsError) {
      setError(variantsError);
      return;
    }

    if (
      !hasOptions &&
      form.compare_at_price &&
      form.compare_at_price <= Number(form.price)
    ) {
      setError("The MRP must be higher than the price (or left empty).");
      return;
    }

    const detailsError = validateProductDetails(details);

    if (detailsError) {
      setError(detailsError);
      return;
    }

    const customizationError = validateCustomizationFields(customizationFields);

    if (customizationError) {
      setError(customizationError);
      return;
    }

    if (!previewImages.length) {
      setError(
        "Please upload at least one product image."
      );
      return;
    }

    setSaving(true);

    /*
      This array tracks newly uploaded
      Cloudinary images.

      If anything fails later,
      we delete these images.
    */

    const uploadedCloudinaryImages: {
      public_id: string;
      url: string;
    }[] = [];

    try {
      /* ===================================================
         STEP 1
         Normalize frontend order
      =================================================== */

      let orderedImages =
        normalizeImages(
          previewImages
        );

      /* ===================================================
         STEP 2
         Upload NEW images to Cloudinary
      =================================================== */

      const finalImages: PreviewImage[] =
        [];

      for (
        const image of orderedImages
      ) {
        /*
          Existing image
        */

        if (!image.file) {
          finalImages.push(
            image
          );
          continue;
        }

        /*
          New image
        */

        const uploaded =
          await uploadImageToCloudinary(
            image.file
          );

        uploadedCloudinaryImages.push(
          {
            public_id:
              uploaded.public_id,
            url: uploaded.url,
          }
        );

        /*
          Replace blob URL with
          Cloudinary URL.
        */

        finalImages.push({
          ...image,
          url: uploaded.url,
          cloudinary_public_id:
            uploaded.public_id,
          file: undefined,
        });
      }

      orderedImages =
        normalizeImages(
          finalImages
        );

      /* ===================================================
         STEP 3
         Prepare product + variants payload

         No options → one default variant using the
         Price/SKU fields. With options → one variant per
         enabled combination. products.price becomes the
         lowest variant price ("From ₹…").
      =================================================== */

      const defaultVariantId = variants.find(
        (variant) => variant.valueKeys.length === 0
      )?.id;

      const variantsPayload = hasOptions
        ? variants.map((variant) => ({
            id: variant.id ?? null,
            value_keys: variant.valueKeys,
            price: Number(variant.price) || 0,
            compare_at_price: variant.compareAtPrice || null,
            sku: variant.sku.trim() || null,
            is_active: variant.isActive,
          }))
        : [
            {
              id: defaultVariantId ?? null,
              value_keys: [],
              price: Number(form.price),
              compare_at_price: form.compare_at_price || null,
              sku: (form.sku ?? "").trim() || null,
              is_active: true,
            },
          ];

      const optionsPayload = options.map((option) => ({
        id: option.id ?? null,
        name: option.name.trim(),
        is_visual: option.isVisual,
        values: option.values.map((value) => ({
          key: value.key,
          id: value.id ?? null,
          value: value.value.trim(),
          image_key: option.isVisual ? value.imageKey : null,
        })),
      }));

      const listingPrice = Math.min(
        ...variantsPayload
          .filter((variant) => variant.is_active)
          .map((variant) => variant.price)
      );

      const productPayload = {
        name: form.name.trim(),

        slug: slugify(
          form.name
        ),

        description:
          (form.description ?? "").trim(),

        category_id:
          form.category_id,

        status:
          form.status,

        width_mm:
          form.width_mm || null,

        height_mm:
          form.height_mm || null,

        length_mm:
          form.length_mm || null,

        weight_grams:
          form.weight_grams || null,

        /*
          Supabase bigint
        */

        price: listingPrice,

        sku:
          variantsPayload.find((variant) => variant.is_active)?.sku ??
          null,

        is_active:
          form.is_active,

        inventory_policy:
          form.inventory_policy ??
          "deny",

        // What's in the box, highlights, specifications, care.
        ...productDetailsPayload(details),
      };

      /* ===================================================
         STEP 4
         SAVE PRODUCT + IMAGES + VARIANTS IN ONE DB TRANSACTION

         save_product() inserts/updates the product, its
         images (existing ones keep their IDs), options and
         variants atomically. If anything fails, nothing is
         written.
      =================================================== */

      const { data: saved, error: saveError } =
        await supabase.rpc("save_product", {
          p_product_id: product?.id ?? null,
          p_product: productPayload,
          p_images: orderedImages.map((image, index) => ({
            key: image.key,
            id: image.id ?? null,
            url: image.url,
            cloudinary_public_id:
              image.cloudinary_public_id ?? null,
            alt_text:
              image.alt_text ??
              `${form.name} image ${index + 1}`,
          })),
          p_options: optionsPayload,
          p_variants: variantsPayload,
          p_customization_fields: customizationFields.map((field) => ({
            id: field.id ?? null,
            key: field.key,
            label: field.label.trim(),
            type: field.type,
            required: field.required,
            help_text: field.helpText?.trim() || null,
            config: field.config,
            pricing: field.pricing,
          })),
        });

      if (saveError) {
        console.log("Save product RPC error:", {
          message: saveError.message,
          code: saveError.code,
          details: saveError.details,
          hint: saveError.hint,
        });

        throw new Error(saveError.message);
      }

      /*
        The DB now references the new uploads, so they
        must not be rolled back from here on.
      */

      uploadedCloudinaryImages.length = 0;

      /* ===================================================
         STEP 5
         DELETE REMOVED OLD CLOUDINARY IMAGES

         Only after the DB transaction has committed.
         If this fails, the scheduled cleanup job removes
         the leftovers.
      =================================================== */

      const removedPublicIds: string[] =
        saved?.removed_public_ids ?? [];

      if (removedPublicIds.length) {
        await cleanupCloudinaryImages(removedPublicIds);
      }

      /* ===================================================
         SUCCESS
      =================================================== */

      // Show the change on the shop straight away.
      refreshStorefront();

      setSuccess(
        product
          ? "Product updated successfully."
          : "Product created successfully."
      );

      /*
        Clean up local blob URLs.
      */

      previewImages.forEach(
        (image) => {
          if (
            image.file &&
            image.url.startsWith(
              "blob:"
            )
          ) {
            URL.revokeObjectURL(
              image.url
            );
          }
        }
      );

      /*
        Small delay so success message
        can be seen before closing.
      */

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      /* ===================================================
         ROLLBACK CLOUDINARY UPLOADS

         If the DB operation failed after
         Cloudinary uploads, remove those
         newly uploaded files.
      =================================================== */

      if (
        uploadedCloudinaryImages.length
      ) {
        await cleanupCloudinaryImages(
          uploadedCloudinaryImages.map(
            (image) =>
              image.public_id
          )
        );
      }

      console.log(
        "Save product error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the product."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  // Lowest price a customer pays before personalisation add-ons.
  const activeVariantPrices = variants
    .filter((variant) => variant.isActive && variant.price > 0)
    .map((variant) => variant.price);

  const previewBasePrice =
    options.length > 0
      ? activeVariantPrices.length
        ? Math.min(...activeVariantPrices)
        : 0
      : Number(form.price) || 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* =================================================
              BACKDROP
          ================================================= */}

          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={() => {
              if (!saving) {
                onClose();
              }
            }}
            className="
              fixed
              inset-0
              z-40
              bg-black/40
              backdrop-blur-sm
            "
          />

          {/* =================================================
              DRAWER
          ================================================= */}

          <motion.aside
            initial={{
              x: 600,
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: 600,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 28,
            }}
            className="
              fixed
              right-0
              top-0
              z-50
              h-screen
              w-full
              max-w-xl
              overflow-y-auto
              border-l
              border-border
              bg-background
            "
          >
            {/* =================================================
                HEADER
            ================================================= */}

            <div
              className="
                sticky
                top-0
                z-20
                border-b
                border-border
                bg-background
              "
            >
              <div className="flex items-center justify-between px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold">
                    {product
                      ? "Edit Product"
                      : "Add Product"}
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    {product
                      ? "Update product information"
                      : "Create a new product"}
                  </p>
                  {/* =================================================
                  ERROR
              ================================================= */}

                  {error && (
                    <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
                      {error}
                    </div>
                  )}

                  {/* =================================================
                  SUCCESS
              ================================================= */}

                  {success && (
                    <div className="rounded-xl border border-success/20 bg-success/10 p-4 text-sm text-success">
                      {success}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={onClose}
                  className="
                    rounded-lg
                    p-2
                    hover:bg-surface-secondary
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* =================================================
                BODY
            ================================================= */}

            <div className="space-y-8 p-6">


              {/* =================================================
                  IMAGES
              ================================================= */}

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      Product Images
                    </h3>

                    <p className="text-sm text-muted-foreground">
                      Drag images to change their
                      sequence. The first image is
                      automatically the cover.
                    </p>
                  </div>

                  <span className="text-sm text-muted-foreground">
                    {previewImages.length}{" "}
                    {previewImages.length === 1
                      ? "Image"
                      : "Images"}
                  </span>
                </div>

                {/* =================================================
                    UPLOAD
                ================================================= */}

                <label
                  className="
                    flex
                    cursor-pointer
                    flex-col
                    items-center
                    justify-center
                    rounded-2xl
                    border-2
                    border-dashed
                    border-border
                    p-8
                    text-center
                    transition
                    hover:bg-surface-secondary
                  "
                >
                  <UploadCloud size={34} />

                  <p className="mt-3 font-medium">
                    Click to upload images
                  </p>

                  <p className="text-sm text-muted-foreground">
                    JPG • PNG • WEBP • Multiple
                    files
                  </p>

                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={saving}
                    onChange={(e) => {
                      handleImages(
                        e.target.files
                      );

                      /*
                        Allows selecting the
                        same file again.
                      */

                      e.target.value = "";
                    }}
                  />
                </label>

                {/* =================================================
                    DRAGGABLE IMAGE LIST
                ================================================= */}

                {previewImages.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={
                      closestCenter
                    }
                    onDragEnd={
                      handleDragEnd
                    }
                  >
                    <SortableContext
                      items={imageIds}
                      strategy={
                        verticalListSortingStrategy
                      }
                    >
                      <div className="space-y-3">
                        {previewImages.map(
                          (
                            image,
                            index
                          ) => (
                            <SortableImage
                              key={
                                image.id ??
                                `new-${image.url}`
                              }
                              image={
                                image
                              }
                              index={
                                index
                              }
                              onRemove={() =>
                                removeImage(
                                  index
                                )
                              }
                            />
                          )
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {/* =================================================
                    ORDER INFO
                ================================================= */}

                {previewImages.length > 0 && (
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-start gap-3">
                      <ImageIcon
                        size={18}
                        className="mt-0.5 shrink-0 text-muted-foreground"
                      />

                      <div>
                        <p className="text-sm font-medium">
                          Image sequence
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Image 1 is always the
                          cover. Drag an image to
                          the top to make it the
                          cover.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* =================================================
                  BASIC INFORMATION
              ================================================= */}

              <section className="space-y-4">
                <h3 className="font-semibold">
                  Basic Information
                </h3>

                {/* Product Name */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Product Name
                  </label>

                  <input
                    value={form.name}
                    disabled={saving}
                    onChange={(e) => {
                      const name =
                        e.target.value;

                      setForm(
                        (prev) => ({
                          ...prev,
                          name,
                          slug: slugify(
                            name
                          ),
                        })
                      );
                    }}
                    className="
                      w-full
                      rounded-xl
                      border
                      border-border
                      bg-surface
                      px-4
                      py-3
                      outline-none
                      focus:ring-2
                      focus:ring-foreground/10
                    "
                    placeholder="Batman Legacy Frame"
                  />
                </div>

                {/* Description */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Description
                  </label>

                  <textarea
                    rows={4}
                    value={
                      form.description ?? ""
                    }
                    disabled={saving}
                    onChange={(e) =>
                      update(
                        "description",
                        e.target.value
                      )
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-border
                      bg-surface
                      px-4
                      py-3
                      outline-none
                      focus:ring-2
                      focus:ring-foreground/10
                    "
                    placeholder="Premium 3D printed decorative wall frame..."
                  />
                </div>
              </section>

              {/* =================================================
                  CATEGORY & STATUS
              ================================================= */}

              <section className="grid grid-cols-2 gap-4">
                {/* Category */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Category
                  </label>

                  <select
                    value={
                      form.category_id ?? ""
                    }
                    onChange={(e) =>
                      update(
                        "category_id",
                        e.target.value
                      )
                    }
                    disabled={
                      categoriesLoading ||
                      saving
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-border
                      bg-surface
                      px-4
                      py-3
                      outline-none
                    "
                  >
                    <option value="">
                      {categoriesLoading
                        ? "Loading categories..."
                        : "Select a category"}
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Status */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Status
                  </label>

                  <select
                    value={
                      form.status
                    }
                    disabled={saving}
                    onChange={(e) =>
                      update(
                        "status",
                        e.target
                          .value as
                        | "Active"
                        | "Draft"
                      )
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-border
                      bg-surface
                      px-4
                      py-3
                    "
                  >
                    <option value="Active">
                      Active
                    </option>

                    <option value="Draft">
                      Draft
                    </option>
                  </select>
                </div>
              </section>

              {/* =================================================
                  DIMENSIONS
              ================================================= */}

              <section className="space-y-4">
                <h3 className="font-semibold">
                  Dimensions & Weight
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Weight */}

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Weight (g)
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 200"
                      value={showWholeNumber(form.weight_grams)}
                      disabled={saving}
                      onChange={(e) =>
                        update(
                          "weight_grams",
                          parseWholeNumber(e.target.value)
                        )
                      }
                      className="
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-surface
                        px-4
                        py-3
                      "
                    />
                  </div>

                  {/* Width */}

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Width (mm)
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 240"
                      value={showWholeNumber(form.width_mm)}
                      disabled={saving}
                      onChange={(e) =>
                        update(
                          "width_mm",
                          parseWholeNumber(e.target.value)
                        )
                      }
                      className="
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-surface
                        px-4
                        py-3
                      "
                    />
                  </div>

                  {/* Length */}

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Length (mm)
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 330"
                      value={showWholeNumber(form.length_mm)}
                      disabled={saving}
                      onChange={(e) =>
                        update(
                          "length_mm",
                          parseWholeNumber(e.target.value)
                        )
                      }
                      className="
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-surface
                        px-4
                        py-3
                      "
                    />
                  </div>

                  {/* Height */}

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Height (mm)
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 20"
                      value={showWholeNumber(form.height_mm)}
                      disabled={saving}
                      onChange={(e) =>
                        update(
                          "height_mm",
                          parseWholeNumber(e.target.value)
                        )
                      }
                      className="
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-surface
                        px-4
                        py-3
                      "
                    />
                  </div>
                </div>
              </section>

              {/* =================================================
                  PRICING
              ================================================= */}

              <section className="space-y-4">
                <h3 className="font-semibold">
                  Pricing
                </h3>

                {options.length > 0 ? (
                  <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted-foreground">
                    This product has options, so price and SKU are set for each variant below.
                    New variants start with 1 in stock; update stock in the Inventory tab.
                  </p>
                ) : (
                <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Price */}

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Price (₹)
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 499"
                      value={showWholeNumber(form.price)}
                      disabled={saving}
                      onChange={(e) =>
                        update(
                          "price",
                          parseWholeNumber(e.target.value) ?? 0
                        )
                      }
                      className="
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-surface
                        px-4
                        py-3
                      "
                    />
                  </div>

                  {/* MRP */}

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      MRP (₹) <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 699"
                      value={showWholeNumber(form.compare_at_price)}
                      disabled={saving}
                      onChange={(e) =>
                        update(
                          "compare_at_price",
                          parseWholeNumber(e.target.value)
                        )
                      }
                      className={`w-full rounded-xl border bg-surface px-4 py-3 ${
                        form.compare_at_price && form.compare_at_price <= Number(form.price)
                          ? "border-danger"
                          : "border-border"
                      }`}
                    />
                  </div>
                </div>

                <p className="-mt-2 text-xs text-muted-foreground">
                  MRP is the original price, shown struck through with the discount (e.g. <s>₹699</s> ₹499 · 29% off).
                  Leave it empty for no discount. Stock is managed in the Inventory tab (new products start with 1).
                </p>

                {/* SKU */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    SKU
                  </label>

                  <input
                    value={
                      form.sku ?? ""
                    }
                    disabled={saving}
                    placeholder="ZLS-XXXX"
                    onChange={(e) =>
                      update(
                        "sku",
                        e.target.value
                      )
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-border
                      bg-surface
                      px-4
                      py-3
                    "
                  />
                </div>
                </>
                )}
              </section>

              {/* =================================================
                  VARIANTS
              ================================================= */}

              <VariantsEditor
                options={options}
                variants={variants}
                onChange={(nextOptions, nextVariants) => {
                  setOptions(nextOptions);
                  setVariants(nextVariants);
                }}
                images={previewImages.map((image) => ({
                  key: image.key,
                  url: image.url,
                  isBlob: image.url.startsWith("blob:"),
                }))}
                defaultPrice={
                  Number(form.price) ||
                  variants.find((variant) => variant.price > 0)?.price ||
                  0
                }
                defaultSku={form.sku ?? ""}
                disabled={saving}
              />

              {/* =================================================
                  PRODUCT DETAILS
              ================================================= */}

              <ProductDetailsEditor
                details={details}
                onChange={setDetails}
                disabled={saving}
              />

              {/* =================================================
                  PERSONALISATION
              ================================================= */}

              <CustomizationEditor
                fields={customizationFields}
                onChange={setCustomizationFields}
                basePrice={previewBasePrice}
                disabled={saving}
              />

              {/* =================================================
                  LIVE PREVIEW
              ================================================= */}

              <ProductLivePreview
                name={form.name}
                description={form.description}
                status={form.status}
                isActive={form.is_active}
                images={previewImages.map((image) => ({
                  key: image.key,
                  url: image.url,
                  isBlob: image.url.startsWith("blob:"),
                }))}
                options={options}
                variants={variants}
                price={Number(form.price) || 0}
              />

              {/* =================================================
                  PUBLISH
              ================================================= */}

              <section className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">
                      Publish Product
                    </h4>

                    <p className="text-sm text-muted-foreground">
                      Product will be visible
                      when active
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      update(
                        "is_active",
                        !form.is_active
                      )
                    }
                    className={`
                      relative
                      h-7
                      w-12
                      rounded-full
                      transition
                      ${form.is_active
                        ? "bg-success"
                        : "bg-zinc-300"
                      }
                    `}
                  >
                    <span
                      className={`
                        absolute
                        top-1
                        h-5
                        w-5
                        rounded-full
                        bg-white
                        transition
                        ${form.is_active
                          ? "left-6"
                          : "left-1"
                        }
                      `}
                    />
                  </button>
                </div>
              </section>
            </div>

            {/* =================================================
                FOOTER
            ================================================= */}

            <div
              className="
                sticky
                bottom-0
                flex
                gap-3
                border-t
                border-border
                bg-background
                p-6
              "
            >
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="
                  flex-1
                  rounded-xl
                  border
                  border-border
                  py-3
                  font-medium
                  hover:bg-surface-secondary
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="
                  flex-1
                  rounded-xl
                  bg-foreground
                  py-3
                  font-medium
                  text-background
                  transition
                  hover:opacity-90
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Saving...
                  </span>
                ) : product ? (
                  "Update Product"
                ) : (
                  "Save Product"
                )}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}