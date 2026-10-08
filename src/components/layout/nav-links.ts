// Main header links, shared by the desktop nav and the phone/tablet menu.
// (Categories come from the database and sit after "All Products".)
//
// /deals, /whats-new and /delivery don't have pages yet.

export const NAV_LINKS = [
  { href: "/deals", label: "Deals" },
  { href: "/whats-new", label: "What's New" },
  { href: "/delivery", label: "Delivery" },
] as const;
