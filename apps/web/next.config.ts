import type { NextConfig } from "next";

export default {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "localhost" }],
        headers: [{ key: "Referrer-Policy", value: "no-referrer-when-downgrade" }],
      },
    ];
  },
  reactStrictMode: true,
  transpilePackages: ["@my-knowledge/content", "@my-knowledge/ui"],
} satisfies NextConfig;
