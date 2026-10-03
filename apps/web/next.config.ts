import type { NextConfig } from "next";

export default {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Link",
            value: [
              '</.well-known/api-catalog>; rel="api-catalog"',
              '</api/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
              '<https://github.com/Pleasurecruise/my-knowledge/blob/main/docs/API.md>; rel="service-doc"',
              '</llms.txt>; rel="describedby"; type="text/plain"',
            ].join(", "),
          },
        ],
      },
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
