import { describe, expect, it } from "vite-plus/test";

import {
  canonicalizeTags,
  createSlug,
  extractHeadings,
  extractWikiLinks,
  hashArticle,
  parseArticleLocales,
  parseArticleDocument,
  parseArticleDocuments,
  resolveLocale,
} from "../src";

const zh = `---
title: 确定性系统
summary: 用明确边界减少意外。
tags:
  - technology/AI-Agents
  - engineering
---
# 确定性系统

连接到 [[已有文章|上下文]]。
`;

const en = `---
title: Deterministic Systems
summary: Reduce surprises with explicit boundaries.
tags:
  - technology/AI-Agents
  - engineering
---
# Deterministic Systems

Connect to [[已有文章|context]].
`;

describe("article documents", () => {
  it("canonicalizes line endings and frontmatter", () => {
    const parsed = parseArticleDocument(zh.replaceAll("\n", "\r\n"));
    expect(parsed.markdown.endsWith("\n")).toBe(true);
    expect(parsed.body).toBe("连接到 [[已有文章|上下文]]。");
    expect(parsed.markdown).not.toContain("# 确定性系统");
    expect(parsed.links).toEqual(["已有文章"]);
    expect(parsed.tags).toEqual(["technology/AI-Agents", "engineering"]);
  });

  it("normalizes blank lines around the body before hashing", async () => {
    const padded = zh.replace("---\n#", "---\n\n\n#");
    const compact = zh.replace("---\n#", "---\n#");
    expect(parseArticleDocument(padded).markdown).toBe(parseArticleDocument(compact).markdown);
    expect((await parseArticleDocuments({ zh: padded, en })).contentHash).toBe(
      (await parseArticleDocuments({ zh: compact, en })).contentHash,
    );
  });

  it("requires the canonical frontmatter order", () => {
    expect(() =>
      parseArticleDocument(
        zh.replace(
          "title: 确定性系统\nsummary: 用明确边界减少意外。",
          "summary: 用明确边界减少意外。\ntitle: 确定性系统",
        ),
      ),
    ).toThrow("Frontmatter keys");
  });

  it("rejects raw HTML and executable links", () => {
    expect(() =>
      parseArticleDocument(zh.replace("# 确定性系统", "<script>alert(1)</script>")),
    ).toThrow("Raw HTML");
    expect(() =>
      parseArticleDocument(zh.replace("# 确定性系统", "[open](javascript:alert(1))")),
    ).toThrow("Executable URLs");
  });

  it("allows HTML-like code without accepting it as article markup", () => {
    expect(() =>
      parseArticleDocument(
        zh.replace(
          "# 确定性系统",
          "```tsx\nconst view = <article>Safe code</article>;\n```\n\n`javascript:example`",
        ),
      ),
    ).not.toThrow();
  });

  it("requires portable spatial data for JSON Canvas blocks", () => {
    const valid = zh.replace(
      "# 确定性系统",
      '```json-canvas\n{"nodes":[{"id":"one","type":"text","text":"One","x":0,"y":0,"width":200,"height":100}],"edges":[]}\n```',
    );
    expect(() => parseArticleDocument(valid)).not.toThrow();
    expect(() =>
      parseArticleDocument(valid.replace('"width":200,"height":100', '"width":0,"height":100')),
    ).toThrow("json-canvas");
  });

  it("rejects mismatched bilingual structure", async () => {
    await expect(
      parseArticleDocuments({ zh, en: en.replace("[[已有文章|context]]", "[[另一篇|context]]") }),
    ).rejects.toThrow("wiki-link targets");
  });

  it("produces the canonical bilingual hash", async () => {
    const article = await parseArticleDocuments({ zh, en });
    expect(article.contentHash).toHaveLength(64);
    await expect(
      hashArticle(
        Object.fromEntries(
          Object.entries(article.editions).map(([locale, edition]) => [locale, edition.markdown]),
        ),
      ),
    ).resolves.toBe(article.contentHash);
  });

  it("accepts additional canonical locales without changing the article shape", async () => {
    const ja = en
      .replace("Deterministic Systems", "決定論的システム")
      .replace(
        "Reduce surprises with explicit boundaries.",
        "明示的な境界で予期しない動作を減らす。",
      );
    const article = await parseArticleDocuments({ zh, en, ja });
    expect(Object.keys(article.editions)).toEqual(["zh", "en", "ja"]);
  });

  it("rejects locale keys that collide after BCP 47 normalization", async () => {
    await expect(parseArticleDocuments({ zh, en, EN: en })).rejects.toThrow(
      "Duplicate article locale: en",
    );
    await expect(hashArticle({ en, EN: en })).rejects.toThrow("Duplicate article locale: en");
  });

  it("resolves exact, compatible, and required default locales", () => {
    expect(resolveLocale(["zh", "en", "ja"], "ja-JP")).toBe("ja");
    expect(resolveLocale(["zh", "en-US"], "en-GB")).toBe("en-us");
    expect(resolveLocale(["zh", "en"], "fr")).toBe("zh");
    expect(resolveLocale(["de"], undefined)).toBeUndefined();
    expect(resolveLocale(["zh", "en"], "not_a_locale")).toBeUndefined();
  });

  it("validates and deduplicates an explicit article locale set", () => {
    expect(parseArticleLocales(["zh", "en", "ja", "JA"])).toEqual(["zh", "en", "ja"]);
    expect(() => parseArticleLocales(["zh", "ja"])).toThrow("require zh and en");
  });
});

describe("portable knowledge rules", () => {
  it("reuses existing tag spelling and removes case-insensitive duplicates", () => {
    expect(canonicalizeTags(["Technology/AI", "technology/ai"], ["technology/AI"])).toEqual([
      "technology/AI",
    ]);
  });

  it("rejects invalid or excessive tags", () => {
    expect(() => canonicalizeTags(["has spaces"])).toThrow("Invalid tag");
    expect(() => canonicalizeTags(["a", "b", "c", "d", "e", "f"])).toThrow("at most 5");
  });

  it("creates stable Unicode slugs", () => {
    expect(createSlug("  知识，与 AI Agents！ ")).toBe("知识-与-ai-agents");
  });

  it("deduplicates wiki-link targets without changing order", () => {
    expect(extractWikiLinks("[[one]] [[two|二]] [[one|一]]")).toEqual(["one", "two"]);
  });

  it("creates stable, unique heading anchors", () => {
    expect(extractHeadings("# Overview\n## Scope\n### Detail\n###### Edge\n## Scope")).toEqual([
      { depth: 1, title: "Overview", id: "overview" },
      { depth: 2, title: "Scope", id: "scope" },
      { depth: 3, title: "Detail", id: "detail" },
      { depth: 6, title: "Edge", id: "edge" },
      { depth: 2, title: "Scope", id: "scope-2" },
    ]);
  });
});
