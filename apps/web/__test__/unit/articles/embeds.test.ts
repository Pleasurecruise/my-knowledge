import { afterEach, expect, it, vi } from "vite-plus/test";
import { readEmbed } from "../../../src/articles/embeds";

afterEach(() => vi.unstubAllGlobals());

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
