import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CUSTOMER_UPLOAD_TYPE,
  customerUploadPreviewUrl,
  uploadOwner,
} from "@/lib/customer-uploads.server";
import { IMAGE_FORMATS, MAX_IMAGE_MB, isUuid, readImageConfig } from "@/lib/customization";

export const runtime = "nodejs";

/**
 * Step 2 of a customer photo upload: the browser has uploaded the file to
 * Cloudinary. Check it (owner, format, size) and register it.
 *
 * Body: { publicId, fieldId?, originalFilename? }
 *   fieldId: the product's customization field, for its size limit.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to upload a photo." }, { status: 401 });
  }

  let body: { publicId?: unknown; fieldId?: unknown; originalFilename?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const publicId = typeof body.publicId === "string" ? body.publicId : "";

  // Only files signed for this user (see signCustomerUpload).
  if (uploadOwner(publicId) !== user.id) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Already registered (e.g. a retried request).
  const { data: existing } = await admin
    .from("customer_uploads")
    .select("id, width, height")
    .eq("cloudinary_public_id", publicId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      id: existing.id,
      width: existing.width,
      height: existing.height,
      previewUrl: customerUploadPreviewUrl(publicId),
    });
  }

  // Size limit: the field's, else the overall cap.
  let maxMB = MAX_IMAGE_MB;

  if (isUuid(body.fieldId)) {
    const { data: field } = await supabase
      .from("product_customization_fields")
      .select("type, config")
      .eq("id", body.fieldId)
      .maybeSingle();

    if (field?.type === "image") maxMB = readImageConfig(field.config).maxMB;
  }

  let resource: { format: string; bytes: number; width: number; height: number };

  try {
    resource = await cloudinary.api.resource(publicId, {
      type: CUSTOMER_UPLOAD_TYPE,
      resource_type: "image",
    });
  } catch (error) {
    console.error("Upload lookup error:", error);
    return NextResponse.json({ error: "Upload not found. Please try again." }, { status: 400 });
  }

  const reject = async (message: string) => {
    await cloudinary.uploader
      .destroy(publicId, { type: CUSTOMER_UPLOAD_TYPE, resource_type: "image", invalidate: true })
      .catch((error) => console.error("Rejected upload delete error:", error));

    return NextResponse.json({ error: message }, { status: 400 });
  };

  if (!IMAGE_FORMATS.includes(resource.format?.toLowerCase())) {
    return reject("Please upload a JPG, PNG, WEBP or HEIC photo.");
  }

  if (resource.bytes > maxMB * 1024 * 1024) {
    return reject(`Photos can be at most ${maxMB} MB.`);
  }

  const originalFilename =
    typeof body.originalFilename === "string" ? body.originalFilename.slice(0, 200) : null;

  const { data: saved, error } = await admin
    .from("customer_uploads")
    .insert({
      user_id: user.id,
      cloudinary_public_id: publicId,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      bytes: resource.bytes,
      original_filename: originalFilename,
    })
    .select("id")
    .single();

  if (error || !saved) {
    console.error("Upload save error:", error);
    return NextResponse.json({ error: "Could not save your photo. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    id: saved.id,
    width: resource.width,
    height: resource.height,
    previewUrl: customerUploadPreviewUrl(publicId),
  });
}
