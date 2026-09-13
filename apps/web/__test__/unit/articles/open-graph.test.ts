import { beforeEach, expect, it, vi } from "vite-plus/test";
import type { ArticleSummary } from "@my-knowledge/content";
import { GET } from "../../../app/articles/[slug]/opengraph-image/route";

const reads = vi.hoisted(() => ({
  metadata: vi.fn<() => Promise<ArticleSummary | null>>(),
  cache: vi.fn(),
  asset: vi.fn(),
  put: vi.fn(),
}));
vi.mock("@/articles", () => ({ getArticleMetadata: reads.metadata }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: {
      BETTER_AUTH_URL: "https://example.com",
      KNOWLEDGE_CACHE: { get: reads.cache, put: reads.put },
      ASSETS: { fetch: reads.asset },
    },
  }),
}));

const article: ArticleSummary = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "example",
  editions: { zh: { title: "知识", summary: "摘要" } },
  tags: [],
  visibility: "public",
  contentHash: "a".repeat(64),
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};
beforeEach(() => {
  vi.resetAllMocks();
  reads.metadata.mockResolvedValue(article);
  reads.cache.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
});

it("checks visibility before cached images and rejects a withdrawn article", async () => {
  const request = new Request(
    `https://example.com/articles/example/opengraph-image?v=${article.contentHash}-4`,
  );
  const params = Promise.resolve({ slug: "example" });
  const publicImage = await GET(request, { params });
  expect(publicImage.status).toBe(200);
  expect(publicImage.headers.get("cache-control")).toBe("no-store");
  expect(reads.metadata).toHaveBeenCalledBefore(reads.cache);
  reads.metadata.mockResolvedValue(null);
  const withdrawn = await GET(request, { params });
  expect(withdrawn.status).toBe(404);
  expect(reads.cache).toHaveBeenCalledOnce();
  expect(reads.asset).not.toHaveBeenCalled();
});

it.each(["old-content-4", `${article.contentHash}-1`, ""])(
  "rejects stale image version %s before cache access",
  async (version) => {
    const response = await GET(
      new Request(`https://example.com/articles/example/opengraph-image?v=${version}`),
      { params: Promise.resolve({ slug: "example" }) },
    );
    expect(response.status).toBe(404);
    expect(reads.cache).not.toHaveBeenCalled();
    expect(reads.asset).not.toHaveBeenCalled();
  },
);

it("propagates cache failures instead of disguising them as successful image reads", async () => {
  reads.cache.mockRejectedValue(new Error("KV unavailable"));
  await expect(
    GET(
      new Request(
        `https://example.com/articles/example/opengraph-image?v=${article.contentHash}-4`,
      ),
      { params: Promise.resolve({ slug: "example" }) },
    ),
  ).rejects.toThrow("KV unavailable");
  expect(reads.asset).not.toHaveBeenCalled();
});
