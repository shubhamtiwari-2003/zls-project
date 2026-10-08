import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicIdFromCloudinaryUrl } from "@/lib/cloudinary-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Must match the folder used in /api/cloudinary/upload.
const PRODUCT_FOLDER = "z-layer-studio/products";

// Uploads younger than this are skipped: they may belong to a product
// save that is still in progress.
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes Cloudinary product images that no database row references.
 *
 * An image counts as referenced if its public_id matches either
 * product_images.cloudinary_public_id OR the public_id inside any stored
 * image URL (product_images.url, categories.image_url, the invoice logo,
 * promotion banners). Older rows have
 * only a URL, so matching on public_id alone is not safe.
 *
 * Auth:  Authorization: Bearer <CRON_SECRET>
 * Usage: GET /api/cloudinary/cleanup                  → report only (default)
 *        GET /api/cloudinary/cleanup?confirm=delete   → actually deletes
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (
    !secret ||
    request.headers.get("authorization") !== `Bearer ${secret}`
  ) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  // Deleting is opt-in: anything other than confirm=delete is a dry run.
  const dryRun =
    new URL(request.url).searchParams.get("confirm") !== "delete";

  try {
    const supabase = createAdminClient();
    const referenced = new Set<string>();
    const unresolvedUrls: string[] = [];

    const addUrl = (url: string | null) => {
      if (!url) return;
      const publicId = publicIdFromCloudinaryUrl(url);
      if (publicId) {
        referenced.add(publicId);
      } else if (url.includes("res.cloudinary.com")) {
        unresolvedUrls.push(url);
      }
    };

    // 1a. product_images: public_id and URL
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("product_images")
        .select("url, cloudinary_public_id")
        .range(from, from + pageSize - 1);

      if (error) throw new Error(error.message);

      for (const row of data) {
        if (row.cloudinary_public_id) referenced.add(row.cloudinary_public_id);
        addUrl(row.url);
      }

      if (data.length < pageSize) break;
    }

    // 1b. categories: image URL
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("image_url");

    if (categoriesError) throw new Error(categoriesError.message);

    categories.forEach((row) => addUrl(row.image_url));

    // 1c. invoice logo (Admin → Invoices → Template)
    const { data: invoiceSettings, error: invoiceSettingsError } = await supabase
      .from("invoice_settings")
      .select("logo_url");

    // Older databases may not have the table yet; that's fine.
    if (invoiceSettingsError && !invoiceSettingsError.message.includes("invoice_settings")) {
      throw new Error(invoiceSettingsError.message);
    }

    (invoiceSettings ?? []).forEach((row) => addUrl(row.logo_url));

    // 1d. promotion images (Admin → Promotions): banners, popups
    const { data: promotions, error: promotionsError } = await supabase
      .from("promotions")
      .select("image_url, image_public_id, mobile_image_url, mobile_image_public_id");

    if (promotionsError && !promotionsError.message.includes("promotions")) {
      throw new Error(promotionsError.message);
    }

    for (const row of promotions ?? []) {
      if (row.image_public_id) referenced.add(row.image_public_id);
      if (row.mobile_image_public_id) referenced.add(row.mobile_image_public_id);
      addUrl(row.image_url);
      addUrl(row.mobile_image_url);
    }

    // Safety: if we can't tell what a Cloudinary URL points to, we can't
    // safely decide anything is unused.
    if (unresolvedUrls.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Refusing to run: some Cloudinary URLs could not be parsed.",
          unresolvedUrls,
        },
        { status: 409 }
      );
    }

    // 2. Every image in the Cloudinary product folder
    const cutoff = Date.now() - GRACE_PERIOD_MS;
    const orphans: string[] = [];
    let scanned = 0;
    let nextCursor: string | undefined;

    do {
      const page = await cloudinary.api.resources({
        type: "upload",
        resource_type: "image",
        prefix: `${PRODUCT_FOLDER}/`,
        max_results: 500,
        next_cursor: nextCursor,
      });

      for (const resource of page.resources) {
        scanned++;

        if (
          !referenced.has(resource.public_id) &&
          new Date(resource.created_at).getTime() < cutoff
        ) {
          orphans.push(resource.public_id);
        }
      }

      nextCursor = page.next_cursor;
    } while (nextCursor);

    // Safety: images exist but the DB returned no references at all —
    // almost certainly a config/permission problem, not "everything unused".
    if (scanned > 0 && referenced.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Refusing to run: the database returned no image references. Check SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 409 }
      );
    }

    // 3. Delete orphans (Cloudinary allows 100 per call)
    let deleted = 0;

    if (!dryRun) {
      for (let i = 0; i < orphans.length; i += 100) {
        const batch = orphans.slice(i, i + 100);
        await cloudinary.api.delete_resources(batch, {
          resource_type: "image",
          invalidate: true,
        });
        deleted += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      scanned,
      referenced: referenced.size,
      orphans,
      deleted,
    });
  } catch (error) {
    console.error("Cloudinary cleanup error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Cleanup failed.",
      },
      { status: 500 }
    );
  }
}
