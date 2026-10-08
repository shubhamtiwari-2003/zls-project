"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

// The admin must type this exactly (case-sensitive) to enable Delete.
const CONFIRM_TEXT = "DELETE";

interface DeleteProductDialogProps {
  productName: string;
  imageCount: number;
  onCancel: () => void;
  // Should throw on failure; the dialog shows the error message.
  onConfirm: () => Promise<void>;
}

export function DeleteProductDialog({
  productName,
  imageCount,
  onCancel,
  onConfirm,
}: DeleteProductDialogProps) {
  const [value, setValue] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = value === CONFIRM_TEXT;

  // Close on Escape, but not while the delete is running.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deleting, onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed || deleting) return;

    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete product."
      );
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => !deleting && onCancel()}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Dialog */}
      <form
        onSubmit={handleSubmit}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-product-title"
        className="relative w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle size={22} />
        </div>

        <h2 id="delete-product-title" className="mt-4 text-xl font-bold">
          Delete product?
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{productName}</span>{" "}
          and its {imageCount} {imageCount === 1 ? "image" : "images"} will be
          permanently deleted. This cannot be undone.
        </p>

        <label className="mt-5 block text-sm">
          Type{" "}
          <span className="rounded bg-danger/10 px-1.5 py-0.5 font-mono font-semibold text-danger">
            {CONFIRM_TEXT}
          </span>{" "}
          to confirm
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={deleting}
            autoComplete="off"
            spellCheck={false}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-mono outline-none focus:ring-2 focus:ring-danger/30"
          />
        </label>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="cursor-pointer rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-background disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!confirmed || deleting}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-medium text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting && <Loader2 size={16} className="animate-spin" />}
            {deleting ? "Deleting..." : "Delete product"}
          </button>
        </div>
      </form>
    </div>
  );
}
