// Plain JavaScript on purpose: Hostinger's build server can't load Next's
// native compiler (old glibc), and the WebAssembly fallback can't compile a
// TypeScript next.config.ts.

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
