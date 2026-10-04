"use client";

import type { AddressErrors, ShippingAddress } from "@/lib/checkout-validation";

const FIELDS: {
  key: keyof ShippingAddress;
  label: string;
  autoComplete: string;
  inputMode?: "numeric" | "tel";
  optional?: boolean;
  wide?: boolean;
}[] = [
  { key: "full_name", label: "Full name", autoComplete: "name", wide: true },
  { key: "phone", label: "Mobile number", autoComplete: "tel", inputMode: "tel", wide: true },
  { key: "line1", label: "House no., building, street", autoComplete: "address-line1", wide: true },
  { key: "line2", label: "Area, landmark", autoComplete: "address-line2", optional: true, wide: true },
  { key: "city", label: "City", autoComplete: "address-level2" },
  { key: "state", label: "State", autoComplete: "address-level1" },
  { key: "postal_code", label: "PIN code", autoComplete: "postal-code", inputMode: "numeric" },
];

interface AddressFieldsProps {
  address: ShippingAddress;
  errors: AddressErrors;
  onChange: (key: keyof ShippingAddress, value: string) => void;
  disabled?: boolean;
}

// Address inputs shared by checkout and the profile address book.
export function AddressFields({ address, errors, onChange, disabled }: AddressFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map((field) => (
        <label key={field.key} className={`block text-sm ${field.wide ? "sm:col-span-2" : ""}`}>
          <span className="font-medium">
            {field.label}
            {field.optional && <span className="font-normal text-muted"> (optional)</span>}
          </span>
          <input
            value={address[field.key]}
            onChange={(e) => onChange(field.key, e.target.value)}
            autoComplete={field.autoComplete}
            inputMode={field.inputMode}
            disabled={disabled}
            aria-invalid={!!errors[field.key]}
            className={`mt-1.5 w-full rounded-xl border bg-background px-4 py-3 outline-none transition focus:ring-2 focus:ring-[#003D29]/20 ${
              errors[field.key] ? "border-red-500" : "border-border"
            }`}
          />
          {errors[field.key] && (
            <span className="mt-1 block text-xs text-red-600">{errors[field.key]}</span>
          )}
        </label>
      ))}
    </div>
  );
}
