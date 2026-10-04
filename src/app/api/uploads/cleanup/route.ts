import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { createAdminClient } from "@/lib/supabase/admin";
import { CUSTOMER_UPLOAD_FOLDER, CUSTOMER_UPLOAD_TYPE } from "@/lib/customer-uploads.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Photos not used in any cart or order after this long are removed.
const STALE_AFTER = "14 days";

// Cloudinary files never registered (upload abandoned half-way) are
// removed after this; younger ones may be mid-upload.
const UNREGISTERED_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Removes customer photos nobody needs:
 *   1. stale:        registered, still 'pending', older than STALE_AFTER and
 *                    not in any cart or live/paid order
 *   2. unregistered: in Cloudinary but never saved to customer_uploads
 *
 * Photos in a paid order are 'ordered' and never touched.
 *
 * Auth:  Authorization: Bearer <CRON_SECRET>
 * Usage: GET /api/uploads/cleanup                  → report only (default)
 *        GET /api/uploads/cleanup?confirm=delete   → actually deletes
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("confirm") !== "delete";

  try {
    const supabase = createAdminClient();

    // 1. Stale registered uploads (decided by the database)
    const { data: stale, error: staleError } = await supabase.rpc("stale_customer_uploads", {
      p_older_than: STALE_AFTER,
    });

    if (staleError) throw new Error(staleError.message);

    const staleRows = (stale ?? []) as { id: string; cloudinary_public_id: string }[];

    // 2. Unregistered Cloudinary files
    const registered = new Set<string>();
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("customer_uploads")
        .select("cloudinary_public_id")
        .range(from, from + pageSize - 1);

      if (error) throw new Error(error.message);
      data.forEach((row) => registered.add(row.cloudinary_public_id));
      if (data.length < pageSize) break;
    }

    const cutoff = Date.now() - UNREGISTERED_GRACE_MS;
    const unregistered: string[] = [];
    let scanned = 0;
    let nextCursor: string | undefined;

    do {
      const page = await cloudinary.api.resources({
        type: CUSTOMER_UPLOAD_TYPE,
        resource_type: "image",
        prefix: `${CUSTOMER_UPLOAD_FOLDER}/`,
        max_results: 500,
        next_cursor: nextCursor,
      });

      for (const resource of page.resources) {
        scanned++;
        if (!registered.has(resource.public_id) && new Date(resource.created_at).getTime() < cutoff) {
          unregistered.push(resource.public_id);
        }
      }

      nextCursor = page.next_cursor;
    } while (nextCursor);

    // Safety: files exist but the database returned none at all. More
    // likely a config problem than "every file is unused", so skip step 2.
    const skipUnregistered = scanned > 0 && registered.size === 0;

    const toDelete = [
      ...staleRows.map((row) => row.cloudinary_public_id),
      ...(skipUnregistered ? [] : unregistered),
    ];

    let deleted = 0;

    if (!dryRun) {
      // Cloudinary first: if removing the rows then fails, the next run
      // simply tries again.
      for (let i = 0; i < toDelete.length; i += 100) {
        const batch = toDelete.slice(i, i + 100);
        await cloudinary.api.delete_resources(batch, {
          type: CUSTOMER_UPLOAD_TYPE,
          resource_type: "image",
          invalidate: true,
        });
        deleted += batch.length;
      }

      if (staleRows.length) {
        const { error } = await supabase
          .from("customer_uploads")
          .delete()
          .in("id", staleRows.map((row) => row.id))
          .eq("status", "pending");

        if (error) throw new Error(error.message);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      scanned,
      registered: registered.size,
      stale: staleRows.map((row) => row.cloudinary_public_id),
      unregistered,
      skippedUnregistered: skipUnregistered
        ? "The database returned no uploads, so unregistered files were left alone."
        : undefined,
      deleted,
    });
  } catch (error) {
    console.error("Customer upload cleanup error:", error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Cleanup failed." },
      { status: 500 }
    );
  }
}
