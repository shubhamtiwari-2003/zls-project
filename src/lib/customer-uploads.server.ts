import "server-only";

import { randomUUID } from "node:crypto";
import cloudinary from "@/lib/cloudinary";

/*
  Customer photos (e.g. for a photo frame).

  - Stored as Cloudinary "authenticated" files: they can't be opened by
    guessing a URL, only through URLs signed here.
  - Kept in their own folder, away from product images, so the product
    image cleanup (/api/cloudinary/cleanup) never sees them.
  - The browser uploads straight to Cloudinary with a signature from
    /api/uploads/sign (no size limit from our server), then registers the
    file with /api/uploads/complete, which checks it and saves a
    customer_uploads row.
*/

export const CUSTOMER_UPLOAD_FOLDER = "z-layer-studio/customer-uploads";
export const CUSTOMER_UPLOAD_TYPE = "authenticated";

const PUBLIC_ID_RE = new RegExp(
  `^${CUSTOMER_UPLOAD_FOLDER}/([0-9a-f-]{36})/[0-9a-f-]{36}$`
);

/** The user a customer-upload public_id belongs to, or null if it isn't one. */
export function uploadOwner(publicId: string): string | null {
  return publicId.match(PUBLIC_ID_RE)?.[1] ?? null;
}

/** Everything the browser needs for one signed upload. */
export function signCustomerUpload(userId: string) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    throw new Error("Cloudinary is not configured.");
  }

  // Every signed parameter is fixed here: the browser can't change the
  // folder, the access type or the allowed formats.
  const params = {
    public_id: `${CUSTOMER_UPLOAD_FOLDER}/${userId}/${randomUUID()}`,
    timestamp: Math.round(Date.now() / 1000),
    type: CUSTOMER_UPLOAD_TYPE,
    allowed_formats: "jpg,jpeg,png,webp,heic,heif",
  };

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    apiKey,
    signature: cloudinary.utils.api_sign_request(params, apiSecret),
    ...params,
  };
}

/** Signed URL of a resized JPEG, for previews. */
export function customerUploadPreviewUrl(publicId: string, size = 800): string {
  return cloudinary.url(publicId, {
    type: CUSTOMER_UPLOAD_TYPE,
    resource_type: "image",
    sign_url: true,
    secure: true,
    format: "jpg",
    transformation: [{ width: size, height: size, crop: "limit", quality: "auto" }],
  });
}

/** Signed URL that downloads the original file (for printing). */
export function customerUploadDownloadUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    type: CUSTOMER_UPLOAD_TYPE,
    resource_type: "image",
    sign_url: true,
    secure: true,
    flags: "attachment",
  });
}
