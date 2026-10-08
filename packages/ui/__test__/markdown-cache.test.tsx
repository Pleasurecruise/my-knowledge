import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { renderMarkdown } from "./render";
import { markdownHighlighter } from "../src/markdown-highlighter";
import { renderMarkdownEmbed } from "../src/markdown-embeds";

const labels = {
  canvas: "Canvas",
  canvasRelationships: "Relationships",
  canvasViewport: "Viewport",
  chart: "Chart",
  diagram: "Diagram",
  copyCode: "Copy code",
  codeCopied: "Code copied",
  codeCopyFailed: "Copy failed",
  renderingDiagram: "Rendering",
  spatialView: "Spatial",
};
const structuredBlock = () => null;
afterEach(() => vi.restoreAllMocks());

it("shares concurrent compilation, separates source/labels, expires and bounds retained results", async () => {
  const highlight = vi.spyOn(await markdownHighlighter, "codeToHast");
  const clock = vi.spyOn(Date, "now").mockReturnValue(100_000);
  const input = { labels, structuredBlock, markdown: "## Cached\n\n```ts\nconst shared = 1;\n```" };
  const results = await Promise.all([renderMarkdown(input), renderMarkdown(input)]);
  expect(renderToStaticMarkup(results[0])).toBe(renderToStaticMarkup(results[1]));
  expect(highlight).toHaveBeenCalledTimes(1);
  await renderMarkdown({ ...input, labels: { ...labels, chart: "图表" } });
  await renderMarkdown({ ...input, markdown: input.markdown.replace("1;", "2;") });
  expect(highlight).toHaveBeenCalledTimes(3);
  clock.mockReturnValue(130_001);
  await renderMarkdown(input);
  expect(highlight).toHaveBeenCalledTimes(4);
  for (let index = 0; index < 16; index++)
    await renderMarkdown({ ...input, markdown: `## Evict ${index}` });
  await renderMarkdown(input);
  expect(highlight).toHaveBeenCalledTimes(5);
});

it("does not retain failed or oversized compilations", async () => {
  const highlight = vi.spyOn(await markdownHighlighter, "codeToHast");
  const input = { labels, structuredBlock, markdown: "```ts\nconst retry = true;\n```" };
  highlight.mockImplementationOnce(() => {
    throw new Error("failed compilation");
  });
  await expect(renderMarkdown(input)).rejects.toThrow("failed compilation");
  expect(renderToStaticMarkup(await renderMarkdown(input))).toContain("retry");
  expect(highlight).toHaveBeenCalledTimes(2);
  const large = { ...input, markdown: input.markdown + "\n" + "x".repeat(131_073) };
  await renderMarkdown(large);
  await renderMarkdown(large);
  expect(highlight).toHaveBeenCalledTimes(4);
});

it("re-evaluates authorized cards on a warm compiled body without leaking an earlier owner result", async () => {
  const markdown =
    "## Authorized\n\n```embed:article\nhttps://knowledge.you-find.me/articles/private\n```";
  const render = async (title: string | null) => {
    const element = await renderMarkdown({
      labels,
      structuredBlock,
      markdown,
      embeds: async (embed) =>
        renderMarkdownEmbed(embed, {
          kind: "articleList",
          items: [
            title === null ? null : { href: "/articles/private", title, description: "Owner only" },
          ],
        }),
    });
    return new Response(await renderToReadableStream(element)).text();
  };
  expect(await render("Private title")).toContain("Private title");
  const anonymous = await render(null);
  expect(anonymous).toContain("Article unavailable");
  expect(anonymous).not.toContain("Private title");
  expect(anonymous).not.toContain("Owner only");
});

it("reuses a serialized KV artifact after memory expiry and keeps dynamic cards request-scoped", async () => {
  const values = new Map<string, string>();
  const cache = {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
  const highlight = vi.spyOn(await markdownHighlighter, "codeToHast");
  const clock = vi.spyOn(Date, "now").mockReturnValue(2_000_000);
  const markdown =
    "## Persistent\n\nMath $x^2$.\n\n```ts\nconst persistent = true;\n```\n\n```embed:article\nhttps://knowledge.you-find.me/articles/private\n```\n\n```embed:architecture\nflowchart LR\nA --> B\n```";
  const render = async (title: string | null) => {
    const element = await renderMarkdown({
      labels,
      markdown,
      structuredBlock,
      cache,
      embeds: async (embed) =>
        renderMarkdownEmbed(embed, {
          kind: "articleList",
          items: [
            title === null
              ? null
              : { href: "/articles/private", title, description: "Visible only to owner" },
          ],
        }),
    });
    return new Response(await renderToReadableStream(element)).text();
  };
  const cold = await render("Owner title");
  clock.mockReturnValue(2_030_001);
  expect(await render("Owner title")).toBe(cold);
  clock.mockReturnValue(2_060_002);
  const anonymous = await render(null);
  expect(anonymous).toContain("Article unavailable");
  expect(anonymous).not.toContain("Owner title");
  expect(highlight).toHaveBeenCalledTimes(1);
  expect(cache.get).toHaveBeenCalledTimes(3);
  expect(cache.put).toHaveBeenCalledTimes(1);
  expect(cache.put).toHaveBeenCalledWith(
    expect.stringMatching(/^compiled\/[a-f0-9]{64}\.json$/u),
    expect.any(String),
    { expirationTtl: 86_400 },
  );
  expect([...values.values()][0]).not.toContain("Owner title");
});

it("separates changed translations, labels and enrichment mode", async () => {
  const values = new Map<string, string>();
  const cache = {
    get: async (key: string) => values.get(key) ?? null,
    put: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const highlight = vi.spyOn(await markdownHighlighter, "codeToHast");
  vi.spyOn(Date, "now").mockReturnValue(3_000_000);
  const input = {
    labels,
    structuredBlock,
    cache,
    markdown: "English\n\n```ts\nconst translated = true;\n```",
  };
  await renderMarkdown(input);
  await renderMarkdown({ ...input, markdown: input.markdown.replace("English", "Japanese") });
  await renderMarkdown({ ...input, labels: { ...labels, diagram: "图表" } });
  await renderMarkdown({ ...input, embeds: async (embed) => renderMarkdownEmbed(embed) });
  expect(highlight).toHaveBeenCalledTimes(4);
  expect(values.size).toBe(4);
});

it("propagates malformed artifacts and KV failures without silently recompiling", async () => {
  const input = { labels, structuredBlock, markdown: "```ts\nconst brokenCache = true;\n```" };
  const highlight = vi.spyOn(await markdownHighlighter, "codeToHast");
  const cache = {
    get: vi.fn(async (): Promise<string | null> => "{}"),
    put: vi.fn(async () => {}),
  };
  await expect(renderMarkdown({ ...input, cache })).rejects.toThrow();
  cache.get.mockRejectedValueOnce(new Error("KV read failed"));
  await expect(renderMarkdown({ ...input, cache })).rejects.toThrow("KV read failed");
  expect(highlight).not.toHaveBeenCalled();
  cache.get.mockResolvedValue(null);
  cache.put.mockRejectedValueOnce(new Error("KV write failed"));
  await expect(renderMarkdown({ ...input, cache })).rejects.toThrow("KV write failed");
  await renderMarkdown({ ...input, cache });
  expect(cache.put).toHaveBeenCalledTimes(2);
  expect(highlight).toHaveBeenCalledTimes(2);
});

it("shares the entire KV operation, retains warm artifacts, expires without rewriting and isolates stores", async () => {
  const values = new Map<string, string>();
  const cache = {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
  const clock = vi.spyOn(Date, "now").mockReturnValue(4_000_000);
  const highlight = vi.spyOn(await markdownHighlighter, "codeToHast");
  const input = { labels, structuredBlock, cache, markdown: "```ts\nconst burst = true;\n```" };
  const results = await Promise.all(Array.from({ length: 8 }, () => renderMarkdown(input)));
  const html = renderToStaticMarkup(results[0]);
  for (const result of results) expect(renderToStaticMarkup(result)).toBe(html);
  expect(cache.get).toHaveBeenCalledTimes(1);
  expect(cache.put).toHaveBeenCalledTimes(1);
  expect(highlight).toHaveBeenCalledTimes(1);
  clock.mockReturnValue(4_029_999);
  await renderMarkdown(input);
  expect(cache.get).toHaveBeenCalledTimes(1);
  clock.mockReturnValue(4_030_001);
  await Promise.all([renderMarkdown(input), renderMarkdown(input)]);
  expect(cache.get).toHaveBeenCalledTimes(2);
  expect(cache.put).toHaveBeenCalledTimes(1);
  expect(highlight).toHaveBeenCalledTimes(1);
  const other = { get: vi.fn(async () => null), put: vi.fn(async () => {}) };
  await renderMarkdown({ ...input, cache: other });
  expect(other.get).toHaveBeenCalledTimes(1);
  expect(other.put).toHaveBeenCalledTimes(1);
  await renderMarkdown({ ...input, cache: null });
  expect(highlight).toHaveBeenCalledTimes(3);
  expect(cache.get).toHaveBeenCalledTimes(2);
});
