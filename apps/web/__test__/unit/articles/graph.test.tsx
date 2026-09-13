import type { ArticleSummary } from "@my-knowledge/content";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vite-plus/test";
import { GraphView } from "@/graph/components/graph-view";
import type { KnowledgeGraphProps } from "@/graph/components/knowledge-graph.types";
import { zh } from "@/i18n/messages/zh";

const reads = vi.hoisted(() => ({ records: vi.fn() }));
vi.mock("@/articles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/articles")>()),
  listGraphArticles: reads.records,
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env: { BETTER_AUTH_URL: "http://localhost:8787" } }),
}));
vi.mock("@/auth/owner", () => ({ getPrincipal: async () => "anonymous" }));
vi.mock("@/i18n/server", () => ({ getInterfaceI18n: async () => ({ messages: zh }) }));
vi.mock("@/graph/components/knowledge-graph", () => ({
  KnowledgeGraph: ({ nodes, edges }: KnowledgeGraphProps) => (
    <div>
      {nodes.map((node) => (
        <p key={node.id}>{node.id}</p>
      ))}
      {edges.map((edge) => (
        <p
          key={`${edge.source}:${edge.target}:${edge.type}`}
        >{`${edge.source}→${edge.target}:${edge.type}`}</p>
      ))}
    </div>
  ),
}));
it("deduplicates URL/wiki edges and excludes targets absent from authorized records", async () => {
  const articles: ArticleSummary[] = ["source", "target"].map((id) => ({
    id,
    slug: `${id}-slug`,
    editions: { zh: { title: id, summary: id } },
    tags: [],
    visibility: "public",
    contentHash: "a".repeat(64),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }));
  reads.records.mockResolvedValue(
    articles.map((article) => ({
      article,
      links:
        article.id === "source"
          ? [
              "target-slug",
              "target",
              "https://knowledge.you-find.me/articles/target",
              "https://knowledge.you-find.me/articles/target-slug",
              "http://localhost:8787/articles/target-slug",
              "https://knowledge.you-find.me/articles/private-secret",
              "https://example.com/articles/source-slug",
            ]
          : [],
    })),
  );
  const html = renderToStaticMarkup(await GraphView());
  expect(html.match(/source→target:link/gu)).toHaveLength(1);
  expect(html).not.toContain("private-secret");
  expect(html).not.toContain("source→source:link");
  expect(reads.records).toHaveBeenCalledWith(
    { BETTER_AUTH_URL: "http://localhost:8787" },
    "anonymous",
    100,
  );
});
