// Plain JavaScript on purpose: Hostinger's build server can't load Next's
// native compiler (old glibc), and the WebAssembly fallback can't compile a
// TypeScript next.config.ts.

/** @type {import('next').NextConfig} */
const nextConfig = {
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
