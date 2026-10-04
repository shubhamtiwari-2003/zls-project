"use client";

// Customer photo upload (photo frames etc.):
//   1. /api/uploads/sign      → signature for one file
//   2. browser → Cloudinary   (direct, with progress)
//   3. /api/uploads/complete  → server checks the file, returns its upload ID

export interface UploadedPhoto {
  id: string;
  width: number | null;
  height: number | null;
  // Signed preview (the file itself is private).
  previewUrl: string;
}

interface SignedUpload {
  uploadUrl: string;
  apiKey: string;
  signature: string;
  public_id: string;
  timestamp: number;
  type: string;
  allowed_formats: string;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error ?? "Upload failed. Please try again.");
  }

  return data as T;
}

function uploadToCloudinary(
  file: File,
  signed: SignedUpload,
  onProgress: (percent: number) => void
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  form.append("public_id", signed.public_id);
  form.append("type", signed.type);
  form.append("allowed_formats", signed.allowed_formats);

  // XHR rather than fetch: fetch can't report upload progress.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.uploadUrl);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      let message = "Upload failed. Please try again.";
      try {
        const cloudinaryMessage = JSON.parse(xhr.responseText)?.error?.message;
        if (typeof cloudinaryMessage === "string" && /format/i.test(cloudinaryMessage)) {
          message = "Please upload a JPG, PNG, WEBP or HEIC photo.";
        } else if (typeof cloudinaryMessage === "string" && /too large|file size/i.test(cloudinaryMessage)) {
          message = "This photo is too large.";
        }
      } catch {
        // Keep the generic message.
      }
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(form);
  });
}

export async function uploadCustomerPhoto(
  file: File,
  fieldId: string | undefined,
  onProgress: (percent: number) => void
): Promise<UploadedPhoto> {
  const signed = await postJson<SignedUpload>("/api/uploads/sign");

  await uploadToCloudinary(file, signed, onProgress);

  return postJson<UploadedPhoto>("/api/uploads/complete", {
    publicId: signed.public_id,
    fieldId,
    originalFilename: file.name,
  });
}
