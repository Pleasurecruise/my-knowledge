import { afterEach, expect, it, vi } from "vite-plus/test";
import { readEmbed } from "../../../src/articles/embeds";

const repositoryCache = vi.hoisted(() => ({
  get: vi.fn<() => Promise<string | null>>(async () => null),
  put: vi.fn(async () => {}),
}));

const articleRow = vi.hoisted(() => vi.fn());
const principal = vi.hoisted(() => vi.fn());
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(async () => ({
    env: { BETTER_AUTH_URL: "https://knowledge.you-find.me", KNOWLEDGE_CACHE: repositoryCache },
  })),
}));
vi.mock("../../../src/auth/owner", () => ({ getPrincipal: principal }));
vi.mock("../../../src/articles/persistence/document", () => ({ getArticleRow: articleRow }));

afterEach(() => {
  vi.unstubAllGlobals();
  repositoryCache.get.mockReset();
  repositoryCache.get.mockResolvedValue(null);
  repositoryCache.put.mockReset();
  articleRow.mockReset();
  principal.mockReset();
});

it("renders repository metadata and aligns stock prices with their trading dates", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          description: "<script>not markup</script>",
          language: "Rust",
          stargazers_count: 1234,
          forks_count: 56,
          open_issues_count: 7,
          owner: { avatar_url: "https://avatars.githubusercontent.com/u/1" },
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          chart: {
            error: null,
            result: [
              {
                meta: { shortName: "Apple", currency: "USD" },
                timestamp: [1788825600, 1788912000, 1788998400],
                indicators: { quote: [{ close: [100, null, 110] }] },
              },
            ],
          },
        }),
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  const repo = await readEmbed({ kind: "github", repo: "owner/repo", align: "wide" });
  const stock = await readEmbed({ kind: "stock", code: "AAPL", align: "right" });
  const repoText = JSON.stringify(repo);
  expect(repoText).toContain("Stars 1,234");
  expect(repoText).toContain('"type":"text","value":"<script>not markup</script>"');
  expect(repoText).not.toContain('"tagName":"script"');
  const stockText = JSON.stringify(stock);
  expect(stockText).toContain("110.00 USD");
  expect(stockText).toContain("+10.00 (+10.00%)");
  expect(stockText).toContain('"tagName":"polyline"');
  expect(stockText).toContain("2026-09-08 — 2026-09-10");
});

it("shows provider failures instead of fabricating metadata or prices", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("limited", { status: 429 })));
  const result = await readEmbed({ kind: "stock", code: "AAPL", align: "wide" });
  const html = JSON.stringify(result);
  expect(html).toContain("Stock prices are unavailable");
  expect(html).toContain("https://finance.yahoo.com/quote/AAPL/");
  expect(html).not.toContain('"tagName":"polyline"');
});

it("does not disguise unexpected implementation failures as unavailable data", async () => {
  const error = new Error("unexpected implementation failure");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
  await expect(readEmbed({ kind: "github", repo: "owner/repo", align: "wide" })).rejects.toBe(
    error,
  );
});

it("renders OG metadata after redirects, preserving entities and relative images", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: "/posts/item" } }),
    )
    .mockResolvedValueOnce(
      new Response(
        `<head><title>Fallback</title>
      <meta property="og:title" content="Rust &amp; Markdown">
      <meta property="og:description" content="&lt;script&gt;plain text&lt;/script&gt;">
      <meta property="og:site_name" content="Example">
      <meta property="og:image" content="../cover.png">
      <meta property="og:url" content="javascript:alert(1)"></head>`,
        { headers: { "content-type": "text/html; charset=utf-8" } },
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  const card = JSON.stringify(
    await readEmbed({ kind: "link", url: "https://example.com/start", align: "wide" }),
  );
  expect(card).toContain("Rust & Markdown");
  expect(card).toContain('"type":"text","value":"<script>plain text</script>"');
  expect(card).toContain("https://example.com/posts/item");
  expect(card).toContain("https://example.com/cover.png");
  expect(card).not.toContain("javascript:");
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("uses page metadata when OG fields are absent and discards executable images", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          `<head><title>Page title</title><meta name="description" content="Summary"><meta property="og:image" content="javascript:alert(1)"></head>`,
          { headers: { "content-type": "text/html" } },
        ),
      ),
  );
  const card = JSON.stringify(
    await readEmbed({ kind: "link", url: "https://example.com/post", align: "wide" }),
  );
  expect(card).toContain("Page title");
  expect(card).toContain("Summary");
  expect(card).not.toContain('"tagName":"img"');
});

it("rejects local links and redirects before fetching their destination", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }),
    );
  vi.stubGlobal("fetch", fetcher);
  for (const url of [
    "http://127.0.0.1",
    "http://2130706433",
    "http://[::1]",
    "https://host.local",
    "https://user:pass@example.com",
  ]) {
    expect(JSON.stringify(await readEmbed({ kind: "link", url, align: "wide" }))).toContain(
      "Link preview is unavailable",
    );
  }
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    JSON.stringify(await readEmbed({ kind: "link", url: "https://example.com", align: "wide" })),
  ).toContain("Link preview is unavailable");
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("renders media without fetching it through the provider boundary", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const result = await readEmbed({
    kind: "media",
    type: "video",
    src: "https://example.com/demo.mp4",
    poster: null,
    title: "Demo",
    caption: null,
    align: "wide",
  });
  expect(fetcher).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).toContain('"src":"https://example.com/demo.mp4#t=0.001"');
  expect(JSON.stringify(result)).toContain('"controls":true');
});

it("resolves same-site URLs to authorized UUID links without a provider fetch", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  principal.mockResolvedValue("owner");
  articleRow.mockResolvedValue({
    id: "article-123",
    title: "Automatic title",
    summary: "Automatic summary",
  });
  const result = await readEmbed({
    kind: "articleList",
    align: "wide",
    urls: ["https://knowledge.you-find.me/articles/article-123"],
  });
  expect(articleRow).toHaveBeenCalledWith(
    expect.objectContaining({ BETTER_AUTH_URL: "https://knowledge.you-find.me" }),
    "owner",
    "article-123",
  );
  const text = JSON.stringify(result);
  expect(text).toContain('"href":"/articles/article-123"');
  expect(text).not.toContain('"target":"_blank"');
  expect(text).toContain('"type":"text","value":"Automatic title"');
  expect(fetcher).not.toHaveBeenCalled();
});

it("keeps missing or unauthorized article targets non-clickable", async () => {
  principal.mockResolvedValue("anonymous");
  articleRow.mockResolvedValue(undefined);
  const result = await readEmbed({
    kind: "articleList",
    align: "wide",
    urls: ["https://knowledge.you-find.me/articles/private-id"],
  });
  expect(articleRow).toHaveBeenCalledWith(
    expect.objectContaining({ BETTER_AUTH_URL: "https://knowledge.you-find.me" }),
    "anonymous",
    "private-id",
  );
  expect(JSON.stringify(result)).toContain("Article unavailable");
  expect(JSON.stringify(result)).not.toContain('"href"');
});

it.each([
  "https://example.com/story",
  "https://example.com/articles/real-slug",
  "https://example.com/articles/%FF",
  "https://knowledge.you-find.me.example.com/articles/real-slug",
  "https://knowledge.you-find.me/explore",
])("does not fetch or link unsupported article target %s", async (url) => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const result = await readEmbed({ kind: "articleList", align: "narrow", urls: [url] });
  expect(fetcher).not.toHaveBeenCalled();
  expect(articleRow).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toContain('"href"');
  expect(JSON.stringify(result)).not.toContain(url);
});

it("resolves article-list URLs through authorized metadata and web routes", async () => {
  principal.mockResolvedValue("anonymous");
  articleRow
    .mockResolvedValueOnce({
      id: "article-456",
      title: "Readable article",
      summary: "Its description",
    })
    .mockResolvedValueOnce(undefined);
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const tree = await readEmbed({
    kind: "articleList",
    align: "wide",
    urls: [
      "https://knowledge.you-find.me/articles/real-slug",
      "https://knowledge.you-find.me/articles/private-slug",
    ],
  });
  const text = JSON.stringify(tree);
  expect(text).toContain("Readable article");
  expect(text).toContain("Its description");
  expect(text).toContain('"href":"/articles/article-456"');
  expect(text).not.toContain('"target":"_blank"');
  expect(text).not.toContain("private-slug");
  expect(text).toContain("Article unavailable");
  expect(fetcher).not.toHaveBeenCalled();
});

it("reports fetch transport failures but propagates TypeErrors outside the request boundary", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network failure")));
  expect(
    JSON.stringify(
      await readEmbed({ kind: "link", url: "https://example.com/network", align: "left" }),
    ),
  ).toContain("Link preview is unavailable");
  const response = new Response("<html></html>");
  const error = new TypeError("Broken processing");
  vi.spyOn(response.headers, "get").mockImplementation(() => {
    throw error;
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  await expect(
    readEmbed({ kind: "link", url: "https://example.com/processing", align: "narrow" }),
  ).rejects.toBe(error);
});

it("reuses public repository metadata and identifies GitHub rate limits without caching failures", async () => {
  const item = {
    description: "Repository",
    language: "Rust",
    stargazers_count: 1,
    forks_count: 0,
    open_issues_count: 0,
    owner: { avatar_url: "https://avatars.githubusercontent.com/u/1" },
  };
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(item)));
  vi.stubGlobal("fetch", fetcher);
  await readEmbed({ kind: "github", repo: "owner/repo", align: "wide" });
  expect(repositoryCache.put).toHaveBeenCalledWith(
    "embed:github:owner/repo",
    JSON.stringify(item),
    { expirationTtl: 3600 },
  );
  repositoryCache.get.mockResolvedValue(JSON.stringify(item));
  expect(
    JSON.stringify(await readEmbed({ kind: "github", repo: "Owner/Repo", align: "wide" })),
  ).toContain("Repository");
  expect(fetcher).toHaveBeenCalledTimes(1);
  repositoryCache.get.mockResolvedValue(null);
  repositoryCache.put.mockClear();
  fetcher.mockResolvedValue(
    new Response("limited", { status: 403, headers: { "x-ratelimit-remaining": "0" } }),
  );
  expect(
    JSON.stringify(await readEmbed({ kind: "github", repo: "owner/repo", align: "wide" })),
  ).toContain("GitHub API rate limit reached");
  expect(repositoryCache.put).not.toHaveBeenCalled();
});
