"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    MoreHorizontal,
} from "lucide-react";

import AddEditProductDrawer from "@/components/admin/AddEditProductDrawer";
import ProductPreviewDrawer from "@/components/admin/tabs/ProductPreviewDrawer";
import { DeleteProductDialog } from "@/components/admin/DeleteProductDialog";
import { supabase } from "@/lib/supabase/client";
import type {
    Product,
    ProductImage,
    ProductOptionDraft,
    ProductVariantDraft,
} from "@/types/products";
import { readFieldRows, type CustomizationFieldRow } from "@/lib/customization";

interface Category {
    id: string;
    name: string;
    slug: string;
}

interface SupabaseProduct {
    id: string;
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
    created_at: string;
    updated_at: string;
    status: "Active" | "Draft" | null;

    categories:
    | {
        id: string;
        name: string;
        slug: string;
    }
    | null;

    product_images: ProductImage[];

    product_options: {
        id: string;
        name: string;
        position: number;
        is_visual: boolean;
        product_option_values: {
            id: string;
            value: string;
            position: number;
            image_id: string | null;
        }[];
    }[];

    product_variants: {
        id: string;
        price: number;
        sku: string | null;
        is_active: boolean;
        position: number;
        variant_option_values: { option_value_id: string }[];
    }[];

    product_customization_fields: CustomizationFieldRow[];
}

const activeVariantCount = (product: SupabaseProduct) =>
    (product.product_variants ?? []).filter((variant) => variant.is_active).length;

// DB options/variants → editable drafts for the product drawer.
// Existing rows use their ID as key.
function toVariantDrafts(product: SupabaseProduct): {
    options: ProductOptionDraft[];
    variants: ProductVariantDraft[];
} {
    const options: ProductOptionDraft[] = [...(product.product_options ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((option) => ({
            key: option.id,
            id: option.id,
            name: option.name,
            isVisual: option.is_visual,
            values: [...(option.product_option_values ?? [])]
                .sort((a, b) => a.position - b.position)
                .map((value) => ({
                    key: value.id,
                    id: value.id,
                    value: value.value,
                    imageKey: value.image_id,
                })),
        }));

    // Order each variant's values like the options.
    const optionIndex = new Map<string, number>();
    options.forEach((option, index) =>
        option.values.forEach((value) => optionIndex.set(value.key, index))
    );

    const variants: ProductVariantDraft[] = [...(product.product_variants ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((variant) => ({
            id: variant.id,
            valueKeys: (variant.variant_option_values ?? [])
                .map((link) => link.option_value_id)
                .filter((id) => optionIndex.has(id))
                .sort((a, b) => optionIndex.get(a)! - optionIndex.get(b)!),
            price: Number(variant.price),
            sku: variant.sku ?? "",
            isActive: variant.is_active,
        }))
        // Variants whose values were removed are retired; don't show them.
        .filter((variant) => variant.valueKeys.length === options.length);

    return { options, variants };
}

export default function Products() {
    // -----------------------------------------
    // Filters
    // -----------------------------------------

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");

    // -----------------------------------------
    // Product data
    // -----------------------------------------

    const [products, setProducts] = useState<
        SupabaseProduct[]
    >([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    // -----------------------------------------
    // Product drawer
    // -----------------------------------------

    const [openDrawer, setOpenDrawer] =
        useState(false);

    const [selectedProduct, setSelectedProduct] =
        useState<Product | null>(null);

    // -----------------------------------------
    // Preview drawer
    // -----------------------------------------

    const [previewOpen, setPreviewOpen] =
        useState(false);

    const [previewProduct, setPreviewProduct] =
        useState<Product | null>(null);

    // -----------------------------------------
    // Delete dialog
    // -----------------------------------------

    const [productToDelete, setProductToDelete] =
        useState<SupabaseProduct | null>(null);

    // =========================================
    // FETCH PRODUCTS
    // =========================================

    const fetchProducts = useCallback(
        async () => {
            try {
                setLoading(true);
                setError("");

                const {
                    data,
                    error: fetchError,
                } = await supabase
                    .from("products")
                    .select(`
                        *,
                        categories (
                            id,
                            name,
                            slug
                        ),
                        product_images (
                            id,
                            product_id,
                            url,
                            cloudinary_public_id,
                            alt_text,
                            "order",
                            is_primary,
                            created_at
                        ),
                        product_options (
                            id, name, position, is_visual,
                            product_option_values ( id, value, position, image_id )
                        ),
                        product_variants (
                            id, price, sku, is_active, position,
                            variant_option_values ( option_value_id )
                        ),
                        product_customization_fields (
                            id, key, label, type, required, help_text, config, pricing, position
                        )
                    `)
                    .order("created_at", {
                        ascending: false,
                    });

                if (fetchError) {
                    console.log(
                        "Products fetch error:",
                        {
                            message:
                                fetchError.message,
                            code:
                                fetchError.code,
                            details:
                                fetchError.details,
                        }
                    );

                    setError(
                        fetchError.message ||
                        "Failed to load products."
                    );

                    setProducts([]);

                    return;
                }

                const formattedProducts =
                    (data ?? []).map(
                        (product) => {
                            const item =
                                product as SupabaseProduct;

                            // Sort images by order
                            const images = [
                                ...(item.product_images ??
                                    []),
                            ].sort(
                                (a, b) =>
                                    (a.order ?? 0) -
                                    (b.order ?? 0)
                            );

                            return {
                                ...item,
                                product_images:
                                    images,
                            };
                        }
                    );

                setProducts(
                    formattedProducts
                );
            } catch (err) {
                console.log(
                    "Unexpected products fetch error:",
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load products."
                );
            } finally {
                setLoading(false);
            }
        },
        []
    );

    // =========================================
    // INITIAL FETCH
    // =========================================

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // =========================================
    // CATEGORIES FOR FILTER
    // =========================================

    const categories = useMemo(() => {
        const names = products
            .map(
                (product) =>
                    product.categories?.name
            )
            .filter(
                (
                    name
                ): name is string =>
                    Boolean(name)
            );

        return [
            "All",
            ...Array.from(
                new Set(names)
            ),
        ];
    }, [products]);

    // =========================================
    // FILTER PRODUCTS
    // =========================================

    const filteredProducts = useMemo(() => {
        return products.filter(
            (product) => {
                const searchValue =
                    search
                        .trim()
                        .toLowerCase();

                const matchesSearch =
                    !searchValue ||
                    product.name
                        .toLowerCase()
                        .includes(
                            searchValue
                        ) ||
                    product.sku
                        ?.toLowerCase()
                        .includes(
                            searchValue
                        );

                const matchesCategory =
                    category === "All" ||
                    product.categories
                        ?.name === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            }
        );
    }, [
        products,
        search,
        category,
    ]);

    // =========================================
    // CONVERT SUPABASE PRODUCT → DRAWER PRODUCT
    // =========================================

    const convertToDrawerProduct = (
        product: SupabaseProduct
    ): Product => {
        return {
            id: product.id,

            sku: product.sku,

            name: product.name,

            slug: product.slug,

            description:
                product.description,

            category_id:
                product.category_id,

            price: Number(
                product.price
            ),

            weight_grams:
                product.weight_grams,

            width_mm:
                product.width_mm,

            height_mm:
                product.height_mm,

            length_mm:
                product.length_mm,

            is_active:
                product.is_active,

            inventory_policy:
                product.inventory_policy,

            status:
                product.status === "Draft"
                    ? "Draft"
                    : "Active",

            images:
                product.product_images ??
                [],

            ...toVariantDrafts(product),

            customizationFields: readFieldRows(
                product.product_customization_fields
            ).map((field) => ({ ...field, uid: field.id ?? field.key })),
        };
    };

    // =========================================
    // OPEN ADD PRODUCT
    // =========================================

    const handleAddProduct = () => {
        setSelectedProduct(null);
        setOpenDrawer(true);
    };

    // =========================================
    // OPEN EDIT PRODUCT
    // =========================================

    const handleEditProduct = (
        product: SupabaseProduct
    ) => {
        setSelectedProduct(
            convertToDrawerProduct(product)
        );

        setOpenDrawer(true);
    };

    // =========================================
    // CLOSE DRAWER + REFRESH
    // =========================================

    const handleDrawerClose = async () => {
        setOpenDrawer(false);
        setSelectedProduct(null);

        // Refresh products so newly uploaded
        // products/images appear immediately.
        await fetchProducts();
    };

    // =========================================
    // OPEN PREVIEW
    // =========================================

    const handlePreviewProduct = (
        product: SupabaseProduct
    ) => {
        setPreviewProduct(
            convertToDrawerProduct(product)
        );

        setPreviewOpen(true);
    };

    // =========================================
    // DELETE PRODUCT
    // =========================================

    const handleDeleteProduct = async (
        product: SupabaseProduct
    ) => {
        /*
          product_images rows are removed by the
          ON DELETE CASCADE foreign key.

          .select() makes an RLS-blocked delete
          visible: it returns no error, just 0 rows.
        */

        const { data, error: deleteError } =
            await supabase
                .from("products")
                .delete()
                .eq("id", product.id)
                .select("id");

        if (deleteError) {
            console.log("Product delete error:", {
                message: deleteError.message,
                code: deleteError.code,
                details: deleteError.details,
            });

            // 23503 = foreign key violation
            if (deleteError.code === "23503") {
                throw new Error(
                    "This product is still linked to other records (e.g. orders). Set it to Draft instead."
                );
            }

            throw new Error(deleteError.message);
        }

        if (!data?.length) {
            throw new Error(
                "Product was not deleted. You may not have permission."
            );
        }

        /*
          Best-effort Cloudinary cleanup. If any
          call fails, the scheduled cleanup job
          removes the leftover files.
        */

        const publicIds = product.product_images
            .map((image) => image.cloudinary_public_id)
            .filter((id): id is string => Boolean(id));

        void Promise.allSettled(
            publicIds.map((publicId) =>
                fetch("/api/cloudinary/delete", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        public_id: publicId,
                    }),
                })
            )
        );

        setProducts((current) =>
            current.filter((p) => p.id !== product.id)
        );

        setProductToDelete(null);
    };

    return (
        <div className="space-y-6">

            {/* =====================================
                HEADER
            ===================================== */}

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div>
                    <h1 className="text-3xl font-bold">
                        Products
                    </h1>

                    <p className="mt-1 text-muted">
                        Manage inventory, pricing
                        and products.
                    </p>
                </div>

                <button
                    onClick={
                        handleAddProduct
                    }
                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-foreground px-5 py-3 font-medium text-background hover:bg-foreground/60"
                >
                    <Plus size={18} />

                    Add Product
                </button>
            </div>

            {/* =====================================
                ERROR
            ===================================== */}

            {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* =====================================
                FILTERS
            ===================================== */}

            <div className="rounded-3xl border border-border bg-surface p-4">

                <div className="flex flex-col gap-3 md:flex-row">

                    {/* Search */}

                    <div className="relative flex-1">

                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                            size={18}
                        />

                        <input
                            value={search}
                            onChange={(e) =>
                                setSearch(
                                    e.target.value
                                )
                            }
                            placeholder="Search products..."
                            className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-foreground/10"
                        />
                    </div>

                    {/* Category */}

                    <select
                        value={category}
                        onChange={(e) =>
                            setCategory(
                                e.target.value
                            )
                        }
                        className="rounded-xl border border-border bg-background px-4 py-3 outline-none"
                    >
                        {categories.map(
                            (categoryName) => (
                                <option
                                    key={
                                        categoryName
                                    }
                                    value={
                                        categoryName
                                    }
                                >
                                    {categoryName}
                                </option>
                            )
                        )}
                    </select>
                </div>
            </div>

            {/* =====================================
                PRODUCT TABLE
            ===================================== */}

            <div className="overflow-hidden rounded-3xl border border-border bg-surface">

                <div className="overflow-x-auto">

                    <table className="w-full min-w-[900px]">

                        <thead className="border-b border-border bg-surface-secondary/40">

                            <tr className="text-left text-sm text-muted">

                                <th className="px-6 py-4 font-medium">
                                    Product
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    SKU
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    Category
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    Price
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    Images
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    Status
                                </th>

                                <th className="px-6 py-4">
                                    Actions
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {/* Loading */}

                            {loading && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-6 py-12 text-center text-sm text-muted"
                                    >
                                        Loading products...
                                    </td>
                                </tr>
                            )}

                            {/* Empty */}

                            {!loading &&
                                filteredProducts.length ===
                                0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-12 text-center"
                                        >
                                            <div className="space-y-2">

                                                <p className="font-medium">
                                                    No products found
                                                </p>

                                                <p className="text-sm text-muted">
                                                    {search ||
                                                        category !==
                                                        "All"
                                                        ? "Try changing your filters."
                                                        : "Create your first product to get started."}
                                                </p>

                                            </div>
                                        </td>
                                    </tr>
                                )}

                            {/* Products */}

                            {!loading &&
                                filteredProducts.map(
                                    (product) => {

                                        const images =
                                            product.product_images ??
                                            [];

                                        const primaryImage =
                                            images.find(
                                                (
                                                    image
                                                ) =>
                                                    image.is_primary
                                            ) ??
                                            images[0];

                                        return (
                                            <tr
                                                key={
                                                    product.id
                                                }
                                                className="border-b border-border transition last:border-0 hover:bg-surface-secondary/30"
                                            >

                                                {/* Product */}

                                                <td className="px-6 py-5">

                                                    <div className="flex items-center gap-4">

                                                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-background">

                                                            {primaryImage?.url ? (
                                                                <Image
                                                                    src={
                                                                        primaryImage.url
                                                                    }
                                                                    alt={
                                                                        primaryImage.alt_text ??
                                                                        product.name
                                                                    }
                                                                    fill
                                                                    sizes="64px"
                                                                    className="object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-full items-center justify-center text-xs text-muted">
                                                                    No image
                                                                </div>
                                                            )}

                                                        </div>

                                                        <div className="min-w-0">

                                                            <h3 className="truncate font-semibold">
                                                                {
                                                                    product.name
                                                                }
                                                            </h3>

                                                            <p className="mt-1 line-clamp-1 text-sm text-muted">
                                                                {
                                                                    product.description ||
                                                                    "No description"
                                                                }
                                                            </p>

                                                        </div>

                                                    </div>

                                                </td>

                                                {/* SKU */}

                                                <td className="px-6 py-5 text-sm font-medium">

                                                    {product.sku ||
                                                        "—"}

                                                </td>

                                                {/* Category */}

                                                <td className="px-6 py-5 text-sm">

                                                    {product.categories
                                                        ?.name ||
                                                        "Uncategorized"}

                                                </td>

                                                {/* Price */}

                                                <td className="px-6 py-5 font-semibold">

                                                    {activeVariantCount(product) > 1 && (
                                                        <span className="mr-1 text-xs font-normal text-muted">
                                                            From
                                                        </span>
                                                    )}
                                                    ₹
                                                    {Number(
                                                        product.price
                                                    ).toLocaleString(
                                                        "en-IN"
                                                    )}

                                                    {activeVariantCount(product) > 1 && (
                                                        <p className="text-xs font-normal text-muted">
                                                            {activeVariantCount(product)} variants
                                                        </p>
                                                    )}

                                                </td>

                                                {/* Images */}

                                                <td className="px-6 py-5 text-sm">

                                                    <span className="rounded-full bg-surface-secondary px-3 py-1">

                                                        {
                                                            images.length
                                                        }

                                                    </span>

                                                </td>

                                                {/* Status */}

                                                <td className="px-6 py-5">

                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-medium ${product.status ===
                                                            "Active"
                                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                                            }`}
                                                    >
                                                        {
                                                            product.status ||
                                                            "Draft"
                                                        }
                                                    </span>

                                                </td>

                                                {/* Actions */}

                                                <td className="px-6 py-5">

                                                    <div className="flex items-center justify-end gap-2">

                                                        {/* Edit */}

                                                        <button
                                                            onClick={() =>
                                                                handleEditProduct(
                                                                    product
                                                                )
                                                            }
                                                            className="cursor-pointer rounded-lg p-2 hover:bg-surface-secondary"
                                                            title="Edit product"
                                                        >
                                                            <Pencil
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>

                                                        {/* Delete */}

                                                        <button
                                                            onClick={() =>
                                                                setProductToDelete(
                                                                    product
                                                                )
                                                            }
                                                            className="cursor-pointer rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            title="Delete product"
                                                        >
                                                            <Trash2
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>

                                                        {/* Preview */}

                                                        <button
                                                            onClick={() =>
                                                                handlePreviewProduct(
                                                                    product
                                                                )
                                                            }
                                                            className="rounded-lg p-2 hover:bg-surface-secondary"
                                                            title="Preview product"
                                                        >
                                                            <MoreHorizontal
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>
                                        );
                                    }
                                )}

                        </tbody>

                    </table>

                </div>

                {/* =================================
                    FOOTER
                ================================= */}

                <div className="flex items-center justify-between border-t border-border px-6 py-4">

                    <p className="text-sm text-muted">
                        Showing{" "}
                        {
                            filteredProducts.length
                        }{" "}
                        of{" "}
                        {products.length}{" "}
                        products
                    </p>

                    <div className="flex gap-2">

                        <button
                            disabled
                            className="cursor-not-allowed rounded-lg border border-border px-4 py-2 text-sm opacity-50"
                        >
                            Previous
                        </button>

                        <button className="rounded-lg bg-foreground px-4 py-2 text-sm text-background">
                            1
                        </button>

                        <button
                            disabled
                            className="cursor-not-allowed rounded-lg border border-border px-4 py-2 text-sm opacity-50"
                        >
                            Next
                        </button>

                    </div>

                </div>

            </div>

            {/* =====================================
                ADD / EDIT PRODUCT DRAWER
            ===================================== */}

            <AddEditProductDrawer
                open={openDrawer}
                onClose={
                    handleDrawerClose
                }
                product={
                    selectedProduct
                }
            />

            {/* =====================================
                PRODUCT PREVIEW DRAWER
            ===================================== */}

            <ProductPreviewDrawer
                open={previewOpen}
                onClose={() => {
                    setPreviewOpen(
                        false
                    );
                    setPreviewProduct(
                        null
                    );
                }}
                product={
                    previewProduct
                }
            />

            {/* =====================================
                DELETE CONFIRMATION
            ===================================== */}

            {productToDelete && (
                <DeleteProductDialog
                    // Fresh state (empty input) for each product
                    key={productToDelete.id}
                    productName={productToDelete.name}
                    imageCount={
                        productToDelete.product_images.length
                    }
                    onCancel={() =>
                        setProductToDelete(null)
                    }
                    onConfirm={() =>
                        handleDeleteProduct(productToDelete)
                    }
                />
            )}

        </div>
    );
}