// Plain JavaScript on purpose: Hostinger's build server can't load Next's
// native compiler (old glibc), and the WebAssembly fallback can't compile a
// TypeScript next.config.ts.

// Security headers on every page and API response.
//   X-Frame-Options       other sites can't show this site in a frame
//                         (clickjacking). SAMEORIGIN: the admin's invoice
//                         preview frames our own PDF route.
//   nosniff               browsers trust the declared file type
//   Referrer-Policy       other sites see only the domain we came from
//   Permissions-Policy    no camera/microphone/location access (photo
//                         uploads use the file picker, which doesn't need it)
//   HSTS                  browsers always use https after the first visit
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't advertise the framework in every response.
  poweredByHeader: false,

  // Files the invoice PDF routes read at runtime that the build can't
  // detect on its own. Hosts like Hostinger deploy only the files the build
  // lists, so without this the PDFs fail there ("Cannot find module
  // …pdfkit/js/standard-fonts/Helvetica.cjs") while working locally.
  //   pdfkit/js      built-in fonts (loaded by name) and font metrics
  //   src/assets     Noto Sans, for the ₹ sign
  outputFileTracingIncludes: {
    "/api/invoices/**": ["./node_modules/pdfkit/js/**/*", "./src/assets/fonts/**/*"],
    "/api/admin/invoices/**": ["./node_modules/pdfkit/js/**/*", "./src/assets/fonts/**/*"],
  },

  // One address for the site: zfactorstudio.in → www.zfactorstudio.in (the
  // address Google sign-in and Supabase are set up for). Matches the bare
  // domain only, so www can never redirect to itself. Don't also add this
  // in Hostinger's Redirects: that rule matches www too and loops.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "zfactorstudio.in" }],
        destination: "https://www.zfactorstudio.in/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  images: {
    // Cloudinary resizes images on its CDN (see src/lib/cloudinary-loader.ts);
    // the Next.js server no longer downloads and resizes originals.
    loader: "custom",
    loaderFile: "./src/lib/cloudinary-loader.ts",

    // Fewer widths = fewer Cloudinary transformations (each width of each
    // image counts once against the plan's monthly allowance).
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [32, 64, 96, 128, 256, 384],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
