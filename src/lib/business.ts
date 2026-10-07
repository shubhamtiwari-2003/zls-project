// Business details and policy terms used by the policy pages, the Contact
// page, the footer and the product page. Edit them here, in one place.
//
// Razorpay checks that these match your Razorpay account (owner name,
// address, contact details) and that the policies match how the site
// really works. Shipping fees and payment timings are not set here: they
// come from shop-config.ts, which the checkout itself uses.
//
// The business is currently UNREGISTERED (run by its owner as a sole
// proprietor, no GST). Razorpay supports this: you sign up as an
// "Unregistered business" with the owner's PAN.
//
// ⚠ Replace every value in [square brackets] before going live. Until then
// the policy pages show a warning listing what's missing.

export const BUSINESS = {
  // Name customers see on the site and in the Razorpay popup.
  brandName: "Z Factor Studio",
  // Owner's full name, exactly as on their PAN / Razorpay account.
  ownerName: "Shubham Kumar Tiwari",
  website: "https://zfactorstudio.in",

  // Address where the business is run (as on the Razorpay account).
  address: {
    line1: "[House / flat, building, street]",
    line2: "[Area / locality]",
    city: "[City]",
    state: "[State]",
    postalCode: "[PIN code]",
    country: "India",
  },

  // false: no GST is charged and prices are described as final prices.
  // When the business registers, set true and fill in gstin.
  gstRegistered: false,
  gstin: "",

  email: "connect@zfactorstudio.in",
  phone: "[phone number]",
  supportHours: "Monday to Saturday, 10:00 AM – 6:00 PM IST",

  // Required by India's IT Rules and the DPDP Act: a named person who
  // handles complaints (usually the owner).
  grievanceOfficer: {
    name: "Shubham Kumar Tiwari",
    email: "connect@zfactorstudio.in",
  },

  // Courts for disputes: the city the business is run from.
  jurisdictionCity: "[City]",
};

// Operational promises made in the policies. Keep them realistic: Razorpay
// and customers hold you to what's written.
export const POLICY_TERMS = {
  effectiveDate: "7 October 2026",

  // Before dispatch (made to order / 3D printed).
  processingDays: "2–4 business days",
  personalisedProcessingDays: "3–6 business days",

  // After dispatch.
  deliveryDaysMetro: "3–5 business days",
  deliveryDaysOther: "5–9 business days",

  shipsTo: "all serviceable PIN codes in India",

  // Damage / wrong item must be reported within this time of delivery.
  damageReportHours: 48,
  // Unused, non-personalised items can be returned within this many days.
  returnWindowDays: 7,
  // After a refund is approved.
  refundDays: "5–7 business days",

  // Unused customer photos are deleted after this (see /api/uploads/cleanup).
  uploadRetentionDays: 14,
} as const;

/** "Z Factor Studio, operated by Jane Doe (sole proprietor)". */
export const operatedBy = () => `${BUSINESS.ownerName} (sole proprietor)`;

export const formatAddress = (separator = ", ") =>
  [
    BUSINESS.address.line1,
    BUSINESS.address.line2,
    `${BUSINESS.address.city} ${BUSINESS.address.postalCode}`,
    BUSINESS.address.state,
    BUSINESS.address.country,
  ]
    .filter(Boolean)
    .join(separator);

/** Details still showing a [placeholder]. Empty = ready. */
export function missingBusinessDetails(): string[] {
  const fields: [string, string][] = [
    ["Owner name", BUSINESS.ownerName],
    ["Address", formatAddress()],
    ["Support email", BUSINESS.email],
    ["Phone number", BUSINESS.phone],
    ["Grievance Officer", `${BUSINESS.grievanceOfficer.name} ${BUSINESS.grievanceOfficer.email}`],
    ["Jurisdiction city", BUSINESS.jurisdictionCity],
  ];

  return fields.filter(([, value]) => /\[.*?\]/.test(value)).map(([label]) => label);
}
