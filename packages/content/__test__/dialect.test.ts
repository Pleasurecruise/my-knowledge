import { describe, expect, it } from "vite-plus/test";

import { isDailyArticle, parseMarkdownEmbed, validateMarkdown } from "../src";

describe("daily classification", () => {
  it("matches only the daily tag hierarchy, independent of case", () => {
    expect(isDailyArticle(["Daily/news", "technology"])).toBe(true);
    expect(isDailyArticle(["DAILY"])).toBe(true);
    expect(isDailyArticle(["daily-notes", "technology/daily", "dailyish"])).toBe(false);
  });
});

describe("Markdown dialect", () => {
  it("validates nested tilde fences while preserving ordinary code examples", () => {
    expect(() => validateMarkdown("> ~~~embed:github\n> repo: owner/project\n> ~~~")).not.toThrow();
    expect(() => validateMarkdown("> ~~~embed:github\n> repo: invalid\n> ~~~")).toThrow(
      "owner/name",
    );
    expect(() =>
      validateMarkdown("````markdown\n```embed:unknown\n<script>example</script>\n```\n````"),
    ).not.toThrow();
  });

  it("rejects unsupported and ambiguous fields", () => {
    expect(() => parseMarkdownEmbed("embed:video", "url: https://example.com")).toThrow(
      "Unsupported embed",
    );
    expect(() =>
      parseMarkdownEmbed("embed:github", "repo: owner/project\nrepo: another/project"),
    ).toThrow("Duplicate");
    expect(() => parseMarkdownEmbed("embed:stock", "ticker: AAPL")).toThrow("Unsupported");
    expect(() => parseMarkdownEmbed("embed:github", "repo: owner/project\nalign: center")).toThrow(
      "alignment",
    );
  });

  it("keeps storyboard text semantic and requires a complete sequence", () => {
    expect(
      parseMarkdownEmbed("embed:storyboard", "title: 发布\nstep: 编写 | 内容\nstep: 发布 | 网站"),
    ).toMatchObject({
      kind: "storyboard",
      align: "wide",
      title: "发布",
      steps: [
        { heading: "编写", body: "内容" },
        { heading: "发布", body: "网站" },
      ],
    });
    expect(() => parseMarkdownEmbed("embed:storyboard", "title: 发布\nstep: 编写 | 内容")).toThrow(
      "two to six",
    );
  });

  it("rejects executable reference URLs after Markdown decoding", () => {
    expect(() =>
      validateMarkdown("[link][target]\n\n[target]: javascript&#58;alert%281%29"),
    ).toThrow("Executable URLs");
  });
});
