// Shipping address rules, shared by the checkout form and the checkout API.

export interface ShippingAddress {
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
}

// A row from the user's address book (public.addresses).
export interface SavedAddress extends ShippingAddress {
  id: string;
}

export type AddressErrors = Partial<Record<keyof ShippingAddress, string>>;

export const EMPTY_ADDRESS: ShippingAddress = {
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
};

// "12 MG Road, Near Park, Pune, Maharashtra, 411001"
export function formatAddressLine(address: ShippingAddress): string {
  return [address.line1, address.line2, address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(", ");
}

// Indian mobile: strips spaces/dashes and a +91 / 91 / 0 prefix.
function normalizePhone(value: string): string {
  const digits = value.replace(/[\s-]/g, "").replace(/^\+/, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function normalizeAddress(input: unknown): ShippingAddress {
  const source = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const text = (key: keyof ShippingAddress) =>
    typeof source[key] === "string" ? (source[key] as string).trim() : "";

  return {
    full_name: text("full_name"),
    phone: normalizePhone(text("phone")),
    line1: text("line1"),
    line2: text("line2"),
    city: text("city"),
    state: text("state"),
    postal_code: text("postal_code"),
  };
}

export function validateAddress(address: ShippingAddress): AddressErrors {
  const errors: AddressErrors = {};
  const length = (value: string, min: number, max: number) =>
    value.length >= min && value.length <= max;

  if (!length(address.full_name, 2, 100)) errors.full_name = "Enter your full name.";
  if (!/^[6-9]\d{9}$/.test(address.phone)) errors.phone = "Enter a valid 10-digit mobile number.";
  if (!length(address.line1, 3, 200)) errors.line1 = "Enter your house / street address.";
  if (address.line2.length > 200) errors.line2 = "Too long.";
  if (!length(address.city, 2, 100)) errors.city = "Enter your city.";
  if (!length(address.state, 2, 100)) errors.state = "Enter your state.";
  if (!/^[1-9]\d{5}$/.test(address.postal_code)) errors.postal_code = "Enter a valid 6-digit PIN code.";

  return errors;
}
