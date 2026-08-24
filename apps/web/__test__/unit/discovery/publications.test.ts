import type { ArticleSummary } from "@my-knowledge/content";
import { describe, expect, it } from "vite-plus/test";

import { createLlmsText, createRssFeed } from "@/discovery/publications";

const publicArticle = {
  id: "6d4f2e69-80ac-4ba5-94b1-6f83d8d5cf1b",
  slug: "xml-and-markdown",
  editions: {
    zh: {
      title: "XML <与> [Markdown]",
      summary: "第一行 & details\n第二行",
    },
  },
  tags: ["engineering/publishing"],
  visibility: "public",
  contentHash: "a".repeat(64),
  createdAt: "2026-08-20T01:02:03.000Z",
  updatedAt: "2026-08-21T04:05:06.000Z",
} satisfies ArticleSummary;

const privateArticle = {
  ...publicArticle,
  id: "0d092880-a7ba-40b0-a338-72385d3851c0",
  slug: "private-notes",
  editions: { zh: { title: "Private title", summary: "Private summary" } },
  visibility: "private",
} satisfies ArticleSummary;

describe("public discovery serialization", () => {
  const origin = new URL("https://knowledge.example");

  it("creates an escaped RSS feed and excludes private input", () => {
    const rss = createRssFeed([publicArticle, privateArticle], origin);

    expect(rss).toContain('<rss version="2.0"');
    expect(rss).toContain("XML &lt;与&gt; [Markdown]");
    expect(rss).toContain("第一行 &amp; details\n第二行");
    expect(rss).toContain("Thu, 20 Aug 2026 01:02:03 GMT");
    expect(rss).toContain("https://knowledge.example/articles/xml-and-markdown");
    expect(rss).not.toContain("Private title");
    expect(rss).not.toContain("private-notes");
  });

  it("creates a concise Markdown index and excludes private input", () => {
    const text = createLlmsText([publicArticle, privateArticle], origin);

    expect(text).toContain("# my knowledge");
    expect(text).toContain(
      "- [XML <与> \\[Markdown\\]](https://knowledge.example/articles/xml-and-markdown): 第一行 & details 第二行",
    );
    expect(text).not.toContain("Private title");
    expect(text).not.toContain("private-notes");
  });

  it("emits valid empty representations", () => {
    expect(createRssFeed([], origin)).not.toContain("<item>");
    expect(createLlmsText([], origin)).toContain("No public articles are available.");
  });
});
