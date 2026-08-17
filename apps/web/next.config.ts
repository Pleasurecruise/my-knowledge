import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER, type PHASE_TYPE } from "next/constants";

const nextConfig = {
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  transpilePackages: [
    "@my-knowledge/ai-core",
    "@my-knowledge/content",
    "@my-knowledge/skills",
    "@my-knowledge/ui",
  ],
} satisfies NextConfig;

export default async function configuration(phase: PHASE_TYPE): Promise<NextConfig> {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    await initOpenNextCloudflareForDev();
  }

  return nextConfig;
}
