import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import {
  customerUploadDownloadUrl,
  customerUploadPreviewUrl,
  uploadOwner,
} from "@/lib/customer-uploads.server";

export const runtime = "nodejs";

/**
 * Signed preview + download links for customer photos in orders (admin).
 *
 * Body: { publicIds: string[] }
 * → { urls: { [publicId]: { preview, download } } }
 */
export async function POST(request: Request) {
  if (!(await getAdmin())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: { publicIds?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const publicIds = Array.isArray(body.publicIds)
    ? body.publicIds.filter((id): id is string => typeof id === "string" && uploadOwner(id) !== null)
    : [];

  if (publicIds.length === 0 || publicIds.length > 50) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const urls = Object.fromEntries(
    publicIds.map((publicId) => [
      publicId,
      {
        preview: customerUploadPreviewUrl(publicId, 400),
        download: customerUploadDownloadUrl(publicId),
      },
    ])
  );

  return NextResponse.json({ urls });
}
