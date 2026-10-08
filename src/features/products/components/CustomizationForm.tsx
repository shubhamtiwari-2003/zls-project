"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { uploadCustomerPhoto, type UploadedPhoto } from "@/features/products/lib/uploadCustomerPhoto";
import { formatINR } from "@/lib/shop-config";
import {
  IMAGE_ACCEPT,
  countChars,
  describePricing,
  fieldPrice,
  imageQualityWarning,
  normalizeText,
  parseAspectRatio,
  type CustomizationField,
  type CustomizationValues,
  type ImageField,
  type TextField,
} from "@/lib/customization";

export const customizationInputId = (key: string) => `customize-${key}`;

interface CustomizationFormProps {
  fields: CustomizationField[];
  // Raw values as typed (text) / upload IDs (photos).
  values: CustomizationValues;
  onChange: (key: string, value: string) => void;
  uploads: Record<string, UploadedPhoto>;
  onUploaded: (key: string, photo: UploadedPhoto) => void;
  onUploadingChange: (key: string, uploading: boolean) => void;
  // Shown after the customer tries to add to cart.
  errors: Record<string, string>;
  showErrors: boolean;
}

/** The "Personalise it" section of the product page. */
export function CustomizationForm(props: CustomizationFormProps) {
  const { fields } = props;

  if (fields.length === 0) return null;

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label="Personalise">
      <h2 className="text-sm font-semibold uppercase tracking-wide">Personalise it</h2>

      <div className="mt-4 space-y-6">
        {fields.map((field) =>
          field.type === "text" ? (
            <TextFieldInput key={field.key} field={field} {...props} />
          ) : (
            <PhotoFieldInput key={field.key} field={field} {...props} />
          )
        )}
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        Personalised items are made just for you, so they can&apos;t be returned unless they arrive damaged.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Text                                    */
/* -------------------------------------------------------------------------- */

function FieldLabel({ field, htmlFor, extra }: { field: CustomizationField; htmlFor?: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {field.label}
        {!field.required && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </label>
      {extra}
    </div>
  );
}

function TextFieldInput({
  field,
  values,
  onChange,
  errors,
  showErrors,
}: CustomizationFormProps & { field: TextField }) {
  const [touched, setTouched] = useState(false);
  const raw = values[field.key] ?? "";
  const text = normalizeText(field.config, raw);
  const count = countChars(text);
  const addOn = fieldPrice(field, text);
  const pricing = describePricing(field);
  const error = (showErrors || touched) && errors[field.key];
  const id = customizationInputId(field.key);

  return (
    <div>
      <FieldLabel
        field={field}
        htmlFor={id}
        extra={
          <span className={`text-xs tabular-nums ${count > field.config.maxLength ? "text-danger" : "text-muted-foreground"}`}>
            {count}/{field.config.maxLength}
          </span>
        }
      />

      {field.helpText && <p className="mt-1 text-xs text-muted-foreground">{field.helpText}</p>}

      <input
        id={id}
        type="text"
        value={raw}
        onChange={(e) => onChange(field.key, e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={field.config.placeholder || undefined}
        // Room for spaces; the real limit is checked on the characters.
        maxLength={field.config.maxLength * 2 + 10}
        autoComplete="off"
        autoCapitalize={field.config.uppercase ? "characters" : "words"}
        spellCheck={false}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-2 w-full rounded-xl border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-foreground/10 ${
          field.config.uppercase ? "uppercase placeholder:normal-case" : ""
        } ${error ? "border-danger" : "border-border"}`}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {pricing ? <span className="text-muted-foreground">{pricing}</span> : <span />}
        {addOn > 0 && <span className="font-semibold">+{formatINR(addOn)}</span>}
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      {/* Live preview */}
      {text && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Preview</span>
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border-2 border-foreground/80 bg-background px-4 py-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-foreground/60" aria-hidden="true" />
            <span className="truncate text-lg font-black tracking-wider">{text}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Photo                                   */
/* -------------------------------------------------------------------------- */

function PhotoFieldInput({
  field,
  values,
  onChange,
  uploads,
  onUploaded,
  onUploadingChange,
  errors,
  showErrors,
}: CustomizationFormProps & { field: ImageField }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);

  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadId = values[field.key];
  const photo = uploadId ? uploads[uploadId] : undefined;
  const uploading = progress !== null;
  const id = customizationInputId(field.key);
  const pricing = describePricing(field);
  const ratio = parseAspectRatio(field.config.aspectRatio) ?? 1;
  const warning = photo ? imageQualityWarning(field.config, photo.width, photo.height) : null;
  const error = uploadError ?? (showErrors ? errors[field.key] : null);

  const handleFile = async (file: File | undefined) => {
    if (!file || uploading) return;

    setUploadError(null);

    if (file.size > field.config.maxMB * 1024 * 1024) {
      setUploadError(`Photos can be at most ${field.config.maxMB} MB.`);
      return;
    }

    setProgress(0);
    onUploadingChange(field.key, true);

    try {
      const uploaded = await uploadCustomerPhoto(file, field.id, setProgress);
      onUploaded(field.key, uploaded);
    } catch (uploadFailure) {
      setUploadError(uploadFailure instanceof Error ? uploadFailure.message : "Upload failed. Please try again.");
    } finally {
      setProgress(null);
      onUploadingChange(field.key, false);
    }
  };

  const goToSignIn = () => {
    const next = `${window.location.pathname}${window.location.search}`;
    router.push(`/sign-in?next=${encodeURIComponent(next)}`);
  };

  const fileInput = (
    <input
      id={id}
      type="file"
      accept={IMAGE_ACCEPT}
      className="sr-only"
      disabled={uploading}
      onChange={(e) => {
        handleFile(e.target.files?.[0]);
        // Lets the same file be picked again.
        e.target.value = "";
      }}
    />
  );

  return (
    <div>
      <FieldLabel field={field} htmlFor={user ? id : undefined} />
      {field.helpText && <p className="mt-1 text-xs text-muted-foreground">{field.helpText}</p>}

      {!user ? (
        <button
          type="button"
          onClick={goToSignIn}
          disabled={authLoading}
          className="mt-2 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-4 py-6 text-center transition hover:border-foreground/40 disabled:opacity-60"
        >
          <ImagePlus size={28} className="text-muted-foreground" />
          <span className="mt-2 text-sm font-medium">Sign in to upload your photo</span>
          <span className="mt-1 text-xs text-muted-foreground">Your photo is stored privately with your account.</span>
        </button>
      ) : photo ? (
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Frame-style preview */}
          <div className="w-40 shrink-0 rounded-md bg-stone-800 p-2 shadow-lg dark:bg-stone-700">
            <div className="relative w-full overflow-hidden bg-white" style={{ aspectRatio: ratio }}>
              <Image
                src={photo.previewUrl}
                alt="Your uploaded photo"
                fill
                sizes="160px"
                unoptimized
                className="object-cover"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-success ">Photo uploaded</p>
            {photo.width && photo.height && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {photo.width} × {photo.height}px
              </p>
            )}

            {warning && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning ">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {warning}
              </p>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              We&apos;ll centre your photo in the frame and check it before printing.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <label
                htmlFor={id}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {uploading ? `Uploading ${progress}%` : "Replace photo"}
              </label>
              {fileInput}

              <button
                type="button"
                onClick={() => onChange(field.key, "")}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-danger"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <label
            htmlFor={id}
            className={`mt-2 flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition hover:border-foreground/40 ${
              error ? "border-danger" : "border-border"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 size={28} className="animate-spin text-muted-foreground" />
                <span className="mt-2 text-sm font-medium">Uploading… {progress}%</span>
                <span className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-border">
                  <span className="block h-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
                </span>
              </>
            ) : (
              <>
                <ImagePlus size={28} className="text-muted-foreground" />
                <span className="mt-2 text-sm font-medium">Upload your photo</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG, WEBP or HEIC · up to {field.config.maxMB} MB
                </span>
              </>
            )}
          </label>
          {fileInput}
        </>
      )}

      {pricing && <p className="mt-2 text-xs text-muted-foreground">{pricing}</p>}

      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
