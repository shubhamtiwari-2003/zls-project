This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

# Shopcart E-Commerce Application

A modern, full-stack e-commerce platform built with Next.js (App Router), TypeScript, and Tailwind CSS.

---

## Project Structure

```text
my-ecommerce/
├── prisma/                                  # Database schema & seeds
│   ├── schema.prisma                        # Prisma data models (User, Product, Cart, Order)
│   └── seed.ts                              # Database seed scripts
│
├── public/                                  # Static assets
│   ├── images/                              # Local banners, fallbacks, placeholders
│   └── favicon.ico                          # Site icon
│
├── src/
│   ├── app/                                 # Next.js App Router root
│   │   ├── (shop)/                          # Website route group (customer layout)
│   │   │   ├── layout.tsx                   # Website root layout (Header, Cart Drawer)
│   │   │   ├── page.tsx                     # Homepage (Trending/Offer hero, categories, deals)
│   │   │   ├── products/
│   │   │   │   ├── page.tsx                 # Full catalog page (filter chips, sort dropdown)
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx             # Product detail page (gallery, variants, reviews)
│   │   │   ├── cart/
│   │   │   │   └── page.tsx                 # Full cart page
│   │   │   └── checkout/
│   │   │       ├── page.tsx                 # Checkout flow (shipping address, summary)
│   │   │       └── success/
│   │   │           └── page.tsx             # Order confirmation page
│   │   │
│   │   ├── (account)/                       # Authenticated customer portal
│   │   │   ├── layout.tsx                   # Account sidebar layout
│   │   │   ├── orders/
│   │   │   │   └── page.tsx                 # Order history & status
│   │   │   └── profile/
│   │   │       └── page.tsx                 # User profile & saved addresses
│   │   │
│   │   ├── admin/                           # Admin dashboard (protected by RBAC)
│   │   │   ├── layout.tsx                   # Admin sidebar & header
│   │   │   ├── products/
│   │   │   │   └── page.tsx                 # Product catalog management
│   │   │   └── orders/
│   │   │       └── page.tsx                 # Customer order management
│   │   │
│   │   ├── api/                             # API Route Handlers
│   │   │   └── webhooks/
│   │   │       └── stripe/
│   │   │           └── route.ts             # Stripe webhook processor
│   │   │
│   │   ├── globals.css                      # Global styles & Tailwind directives
│   │   └── layout.tsx                       # Root HTML document & top-level providers
│   │
│   ├── components/                          # Shared UI elements
│   │   ├── layout/
│   │   │   ├── Header.tsx                   # Top utility bar, main nav, search, modal triggers
│   │   │   └── Footer.tsx                   # Global site footer
│   │   └── ui/                              # Reusable primitives (buttons, modals, inputs)
│   │
│   ├── features/                            # Domain-driven feature modules
│   │   ├── auth/                            # Authentication module
│   │   │   ├── components/
│   │   │   │   └── AuthModal.tsx            # Floating login/signup modal (Name & Phone)
│   │   │   ├── actions/                     # Server actions for OTP handling
│   │   │   └── types.ts
│   │   │
│   │   ├── home/                            # Homepage-specific components
│   │   │   └── components/
│   │   │       ├── DepartmentHero.tsx       # Isometric 3D podium showcase
│   │   │       └── TopCategories.tsx        # Colored category tile grid
│   │   │
│   │   ├── products/                        # Product domain
│   │   │   ├── components/
│   │   │   │   ├── ProductCard.tsx          # Card with image, heart icon, rating, add-to-cart
│   │   │   │   ├── HeroBanner.tsx           # Category promotional banner
│   │   │   │   ├── FilterBar.tsx            # Interactive filter chips & sorting controls
│   │   │   │   └── ProductGallery.tsx       # PDP image thumbnail carousel
│   │   │   ├── actions/                     # Product search/filter server actions
│   │   │   └── types.ts
│   │   │
│   │   ├── cart/                            # Shopping cart domain
│   │   │   ├── components/
│   │   │   │   ├── CartDrawer.tsx           # Slide-out flyout cart panel
│   │   │   │   └── CartItemRow.tsx          # Cart line item with quantity steppers
│   │   │   ├── actions/                     # Cart cookie sync & server actions
│   │   │   └── store.ts                     # Client state (Zustand / Context)
│   │   │
│   │   └── checkout/                        # Checkout domain
│   │       ├── components/
│   │       │   ├── AddressForm.tsx
│   │       │   └── OrderSummary.tsx
│   │       └── actions/                     # Payment intent initialization
│   │
│   ├── lib/                                 # Shared configurations & singletons
│   │   ├── db.ts                            # Prisma client singleton
│   │   ├── firebase.ts                      # Firebase Auth client initialization (OTP)
│   │   ├── stripe.ts                        # Stripe SDK configuration
│   │   └── utils.ts                         # Tailwind clsx/twMerge utilities
│   │
│   └── types/                               # Global ambient TypeScript definitions
│       └── index.ts
│
├── .env.example                             # Environment variables template
├── middleware.ts                            # Route guards for admin & account paths
├── next.config.ts                           # Next.js configuration (remote image domains)
├── package.json
├── tailwind.config.ts                       # Tailwind CSS custom theme colors
└── tsconfig.json                            # TypeScript configuration & path aliases