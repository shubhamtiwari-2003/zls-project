"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Wallet,
  Plus,
  Minus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Product } from "@/types/products";

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function ProductPreviewDrawer({
  open,
  onClose,
  product,
}: Props) {
  const [selectedImage, setSelectedImage] =
    useState(0);

  const [quantity, setQuantity] =
    useState(1);

  /* ========================================================
     RESET PREVIEW WHEN PRODUCT CHANGES
  ======================================================== */

  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
  }, [product?.id, open]);

  /* ========================================================
     SORT IMAGES BY ORDER

     order 0 = cover
     order 1 = second image
     order 2 = third image
     ...
  ======================================================== */

  const orderedImages = useMemo(() => {
    if (!product?.images) {
      return [];
    }

    return [...product.images].sort(
      (a, b) =>
        (a.order ?? 0) -
        (b.order ?? 0)
    );
  }, [product?.images]);

  /* ========================================================
     SAFETY CHECK
  ======================================================== */

  if (!product) {
    return null;
  }

  /* ========================================================
     CURRENT IMAGE
  ======================================================== */

  const currentImage =
    orderedImages[selectedImage] ??
    orderedImages[0] ??
    null;

  /* ========================================================
     CATEGORY

     Your Product only contains category_id.
     If your Products page maps the category name
     into the Product object, use it here.

     Otherwise show a generic fallback.
  ======================================================== */

  const categoryName =
    (product as Product & {
      category?: string;
    }).category ??
    "Product";

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ==================================================
              BACKDROP
          ================================================== */}

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
            onClick={onClose}
            className="
              fixed
              inset-0
              z-40
              bg-black/50
              backdrop-blur-sm
            "
          />

          {/* ==================================================
              DRAWER
          ================================================== */}

          <motion.aside
            initial={{
              x: 700,
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: 700,
            }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 28,
            }}
            className="
              fixed
              right-0
              top-0
              z-50
              h-screen
              w-full
              max-w-2xl
              overflow-y-auto
              border-l
              border-border
              bg-background
            "
          >
            {/* ==================================================
                HEADER
            ================================================== */}

            <div
              className="
                sticky
                top-0
                z-20
                flex
                items-center
                justify-between
                border-b
                border-border
                bg-background
                px-6
                py-5
              "
            >
              <div>
                <h2 className="text-xl font-bold">
                  Website Preview
                </h2>

                <p className="text-sm text-muted-foreground">
                  This is how customers will see
                  the product
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="
                  rounded-lg
                  p-2
                  hover:bg-surface-secondary
                "
              >
                <X size={20} />
              </button>
            </div>

            {/* ==================================================
                CONTENT
            ================================================== */}

            <div className="space-y-6 p-6">
              {/* ==================================================
                  IMAGE GALLERY
              ================================================== */}

              <section className="space-y-3">
                {/* Main Image */}

                <div
                  className="
                    relative
                    aspect-square
                    overflow-hidden
                    rounded-3xl
                    border
                    border-border
                    bg-surface
                  "
                >
                  {currentImage ? (
                    <Image
                      src={currentImage.url}
                      alt={
                        currentImage.alt_text ??
                        product.name
                      }
                      fill
                      unoptimized={currentImage.url.startsWith(
                        "blob:"
                      )}
                      className="
                        object-cover
                        transition
                        duration-300
                      "
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No product image
                    </div>
                  )}

                  {/* Cover Badge */}

                  {selectedImage === 0 &&
                    currentImage && (
                      <div className="absolute left-4 top-4 rounded-full bg-black/75 px-3 py-1.5 text-xs font-medium text-white">
                        Cover Image
                      </div>
                    )}
                </div>

                {/* ==================================================
                    THUMBNAILS
                ================================================== */}

                {orderedImages.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {orderedImages.map(
                      (image, index) => (
                        <button
                          type="button"
                          key={
                            image.id ??
                            `${image.url}-${index}`
                          }
                          onClick={() =>
                            setSelectedImage(
                              index
                            )
                          }
                          className={`
                            relative
                            h-20
                            w-20
                            shrink-0
                            overflow-hidden
                            rounded-xl
                            border-2
                            transition
                            ${
                              selectedImage ===
                              index
                                ? "border-foreground"
                                : "border-border"
                            }
                          `}
                        >
                          <Image
                            src={image.url}
                            alt={
                              image.alt_text ??
                              `Product image ${
                                index + 1
                              }`
                            }
                            fill
                            unoptimized={image.url.startsWith(
                              "blob:"
                            )}
                            className="object-cover"
                          />

                          {/* Image number */}

                          <span
                            className="
                              absolute
                              bottom-1
                              left-1
                              rounded
                              bg-black/70
                              px-1.5
                              py-0.5
                              text-[9px]
                              text-white
                            "
                          >
                            {index + 1}
                          </span>

                          {/* Cover */}

                          {index === 0 && (
                            <span
                              className="
                                absolute
                                right-1
                                top-1
                                rounded
                                bg-black/70
                                px-1.5
                                py-0.5
                                text-[9px]
                                text-white
                              "
                            >
                              Cover
                            </span>
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}
              </section>

              {/* ==================================================
                  PRODUCT DETAILS
              ================================================== */}

              <div>
                {/* Category */}

                <span
                  className="
                    inline-flex
                    rounded-full
                    bg-surface-secondary
                    px-3
                    py-1
                    text-xs
                    font-medium
                  "
                >
                  {categoryName}
                </span>

                {/* Product Name */}

                <h1 className="mt-4 text-3xl font-bold">
                  {product.name}
                </h1>

                {/* Description */}

                <p className="mt-2 leading-7 text-muted-foreground">
                  {product.description ||
                    "No product description available."}
                </p>

                {/* ==================================================
                    RATING
                ================================================== */}

                <div className="mt-4 flex items-center gap-1">
                  {Array.from({
                    length: 5,
                  }).map((_, index) => (
                    <Star
                      key={index}
                      size={16}
                      className="
                        fill-yellow-400
                        text-yellow-400
                      "
                    />
                  ))}

                  <span className="ml-2 text-sm text-muted-foreground">
                    5.0 (124 Reviews)
                  </span>
                </div>

                {/* ==================================================
                    PRICE
                ================================================== */}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="text-4xl font-black">
                    ₹
                    {Number(
                      product.price
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </span>

                  <span className="text-xl text-muted-foreground line-through">
                    ₹
                    {Math.round(
                      Number(
                        product.price
                      ) * 1.2
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </span>

                  <span
                    className="
                      rounded-full
                      bg-black
                      px-3
                      py-1
                      text-xs
                      text-white
                      dark:bg-white
                      dark:text-black
                    "
                  >
                    20% OFF
                  </span>
                </div>
              </div>

              {/* ==================================================
                  FEATURES
              ================================================== */}

              <div className="grid grid-cols-2 gap-3">
                <Feature
                  icon={
                    <Truck size={18} />
                  }
                  title="Free Shipping"
                />

                <Feature
                  icon={
                    <Wallet size={18} />
                  }
                  title="Cash on Delivery"
                />

                <Feature
                  icon={
                    <ShieldCheck
                      size={18}
                    />
                  }
                  title="Premium Quality"
                />

                <Feature
                  icon={
                    <RotateCcw
                      size={18}
                    />
                  }
                  title="Easy Replacement"
                />
              </div>

              {/* ==================================================
                  SPECS
              ================================================== */}

              <div className="grid grid-cols-3 gap-3">
                <Spec
                  title="Weight"
                  value={
                    product.weight_grams
                      ? `${product.weight_grams}g`
                      : "—"
                  }
                />

                <Spec
                  title="Width"
                  value={
                    product.width_mm
                      ? `${product.width_mm}mm`
                      : "—"
                  }
                />

                <Spec
                  title="Height"
                  value={
                    product.height_mm
                      ? `${product.height_mm}mm`
                      : "—"
                  }
                />
              </div>

              {/* ==================================================
                  MORE SPECIFICATIONS
              ================================================== */}

              <div className="grid grid-cols-2 gap-3">
                <Spec
                  title="Length"
                  value={
                    product.length_mm
                      ? `${product.length_mm}mm`
                      : "—"
                  }
                />

                <Spec
                  title="SKU"
                  value={
                    product.sku || "—"
                  }
                />
              </div>

              {/* ==================================================
                  QUANTITY
              ================================================== */}

              <div>
                <p className="mb-3 text-sm font-semibold">
                  QUANTITY
                </p>

                <div className="flex items-center gap-4">
                  <div
                    className="
                      flex
                      items-center
                      rounded-full
                      border
                      border-border
                    "
                  >
                    {/* Minus */}

                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(
                          (current) =>
                            Math.max(
                              1,
                              current - 1
                            )
                        )
                      }
                      className="
                        rounded-full
                        p-3
                        transition
                        hover:bg-surface-secondary
                      "
                    >
                      <Minus
                        size={16}
                      />
                    </button>

                    {/* Quantity */}

                    <span className="w-10 text-center">
                      {quantity}
                    </span>

                    {/* Plus */}

                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(
                          (current) =>
                            current + 1
                        )
                      }
                      className="
                        rounded-full
                        p-3
                        transition
                        hover:bg-surface-secondary
                      "
                    >
                      <Plus
                        size={16}
                      />
                    </button>
                  </div>

                  <span className="text-sm text-muted-foreground">
                    Inventory managed
                    separately
                  </span>
                </div>
              </div>

              {/* ==================================================
                  WEBSITE CTA
              ================================================== */}

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled
                  className="
                    w-full
                    rounded-full
                    bg-brand
                    py-4
                    font-semibold
                    text-white
                    opacity-90
                  "
                >
                  Add to Cart
                </button>

                <button
                  type="button"
                  disabled
                  className="
                    w-full
                    rounded-full
                    border
                    border-border
                    py-4
                    font-semibold
                    opacity-90
                  "
                >
                  Buy Now
                </button>
              </div>

              {/* ==================================================
                  FOOTER NOTE
              ================================================== */}

              <div
                className="
                  rounded-2xl
                  bg-surface-secondary
                  p-4
                  text-sm
                  text-muted-foreground
                "
              >
                Preview Mode • Buttons are
                disabled. The image sequence above
                follows the same order saved in
                <code className="mx-1 rounded bg-background px-1.5 py-0.5 text-xs">
                  product_images.order
                </code>
                .
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ==========================================================
   FEATURE
========================================================== */

function Feature({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-3
        rounded-2xl
        border
        border-border
        p-4
      "
    >
      {icon}

      <span className="text-sm font-medium">
        {title}
      </span>
    </div>
  );
}

/* ==========================================================
   SPEC
========================================================== */

function Spec({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-border
        p-4
        text-center
      "
    >
      <p className="text-lg font-bold">
        {value}
      </p>

      <p
        className="
          mt-1
          text-xs
          uppercase
          text-muted-foreground
        "
      >
        {title}
      </p>
    </div>
  );
}