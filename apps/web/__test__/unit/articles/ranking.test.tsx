import type { ArticleSummary } from "@my-knowledge/content";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vite-plus/test";
import { ArticleList } from "@/articles/components/article-list";

vi.mock("@/shell/intent-link", () => ({ IntentLink: "a" }));
// Frozen, already-authorized provider order: highest relevance is the oldest article.
const corpus: ArticleSummary[] = [2020, 2026, 2023].map((year) => ({
  id: String(year),
  slug: `article-${year}`,
  editions: { zh: { title: `Title ${year}`, summary: "Summary" } },
  tags: [],
  visibility: "public",
  contentHash: "a".repeat(64),
  createdAt: `${year}-01-01T00:00:00.000Z`,
  updatedAt: `${year}-01-01T00:00:00.000Z`,
}));
it("preserves provider relevance across years instead of applying the chronology baseline", () => {
  const render = (order: "chronology" | "relevance") =>
    renderToStaticMarkup(
      <ArticleList articles={corpus} empty="Empty" entryUnit="articles" order={order} />,
    );
  const baseline = render("chronology");
  const candidate = render("relevance");
  expect([...baseline.matchAll(/href="([^"]+)"/gu)].map((match) => match[1])).toEqual([
    "/articles/article-2026",
    "/articles/article-2023",
    "/articles/article-2020",
  ]);
  expect([...candidate.matchAll(/href="([^"]+)"/gu)].map((match) => match[1])).toEqual(
    corpus.map(({ slug }) => `/articles/${slug}`),
  );
  expect(candidate).not.toContain("article-year-heading");
});

it("renders translated title and summary while falling back to Chinese per article", () => {
  const articles = corpus.map((article, index) =>
    index === 0
      ? {
          ...article,
          editions: { ...article.editions, ja: { title: "翻訳タイトル", summary: "翻訳概要" } },
        }
      : article,
  );
  const html = renderToStaticMarkup(
    <ArticleList articles={articles} empty="Empty" entryUnit="articles" locale="ja" />,
  );
  expect(html).toContain("翻訳タイトル");
  expect(html).toContain("翻訳概要");
  expect(html).not.toContain("Title 2020");
  expect(html).toContain("Title 2026");
});
