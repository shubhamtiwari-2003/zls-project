"use client";

import { useState } from "react";
import { Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { AddressFields } from "@/features/checkout/components/AddressFields";
import {
  EMPTY_ADDRESS,
  formatAddressLine,
  normalizeAddress,
  validateAddress,
  type AddressErrors,
  type SavedAddress,
  type ShippingAddress,
} from "@/lib/checkout-validation";

interface AddressBookProps {
  initialAddresses: SavedAddress[];
  defaultName: string;
}

// null = no form open, "new" = adding, otherwise the ID being edited.
type Editing = null | "new" | string;

export function AddressBook({ initialAddresses, defaultName }: AddressBookProps) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [fieldErrors, setFieldErrors] = useState<AddressErrors>({});
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setEditing("new");
    setForm({ ...EMPTY_ADDRESS, full_name: defaultName });
    setFieldErrors({});
    setError(null);
  };

  const openEdit = (address: SavedAddress) => {
    const { id, ...fields } = address;
    setEditing(id);
    setForm(fields);
    setFieldErrors({});
    setError(null);
  };

  const closeForm = () => {
    setEditing(null);
    setFieldErrors({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const address = normalizeAddress(form);
    const errors = validateAddress(address);

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          replacesAddressId: editing !== "new" ? editing : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        throw new Error(data.error ?? "Could not save the address.");
      }

      setAddresses(data.addresses);
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the address.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm("Remove this address from your address book?")) return;

    setRemovingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Could not remove the address.");

      setAddresses(data.addresses);
      if (editing === id) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the address.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="mt-8 rounded-3xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Saved addresses</h2>

        {editing === null && (
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-foreground/40"
          >
            <Plus size={16} />
            Add address
          </button>
        )}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</p>}

      {/* Add / edit form */}
      {editing !== null && (
        <form onSubmit={handleSave} noValidate className="mt-4 rounded-2xl border border-border p-4">
          <h3 className="mb-4 text-sm font-semibold">{editing === "new" ? "New address" : "Edit address"}</h3>

          {editing !== "new" && (
            <p className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              Your changes will be saved as a new address. Past orders keep the address they were shipped to.
            </p>
          )}

          <AddressFields
            address={form}
            errors={fieldErrors}
            onChange={(key, value) => {
              setForm((current) => ({ ...current, [key]: value }));
              setFieldErrors((current) => ({ ...current, [key]: undefined }));
            }}
            disabled={busy}
          />

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeForm}
              disabled={busy}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 rounded-full bg-[#003D29] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#002B1D] disabled:opacity-50"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {busy ? "Saving..." : "Save address"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {addresses.length === 0 && editing === null ? (
        <div className="mt-6 flex flex-col items-center py-6 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No saved addresses yet.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {addresses
            .filter((address) => address.id !== editing)
            .map((address) => (
              <li key={address.id} className="flex items-start gap-3 rounded-2xl border border-border p-4">
                <MapPin size={18} className="mt-0.5 shrink-0 text-muted-foreground" />

                <div className="min-w-0 flex-1 text-sm">
                  <p>
                    <span className="font-semibold">{address.full_name}</span>
                    <span className="text-muted-foreground"> · {address.phone}</span>
                  </p>
                  <p className="mt-1 text-muted-foreground">{formatAddressLine(address)}</p>
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(address)}
                    disabled={busy || removingId !== null}
                    className="rounded-lg p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    aria-label="Edit address"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(address.id)}
                    disabled={busy || removingId !== null}
                    className="rounded-lg p-2 text-muted-foreground hover:text-red-500 disabled:opacity-40"
                    aria-label="Remove address"
                  >
                    {removingId === address.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
