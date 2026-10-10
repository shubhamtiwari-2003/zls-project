import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdmin } from "@/lib/auth";
import { STOREFRONT_TAG } from "@/lib/storefront-cache";

export const runtime = "nodejs";

/**
 * Clears the shop's server cache after an admin change (products,
 * categories, promotions, settings, stock), so the site shows it straight
 * away instead of within a minute. Called by refreshStorefront().
 */
export async function POST() {
  if (!(await getAdmin())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  // expire: 0 → the next visitor gets fresh data, never the old copy.
  revalidateTag(STOREFRONT_TAG, { expire: 0 });
  return NextResponse.json({ revalidated: true });
}
