import { describe, expect, it } from "vite-plus/test";

import {
  isDailyArticle,
  parseMarkdownEmbed,
  validateMarkdown,
  serializeArticleDocument,
  parseArticleDocument,
} from "../src";

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

it("preserves link fences through article validation and rejects unsafe or ambiguous links", () => {
  const body = "```embed:link\nurl: https://example.com/article?a=1&b=2\nalign: right\n```";
  const source = serializeArticleDocument({ title: "Link", summary: "Summary", tags: [], body });
  expect(parseArticleDocument(source).body).toBe(body);
  expect(
    parseMarkdownEmbed("embed:link", "url: https://example.com/article\nalign: right"),
  ).toEqual({ kind: "link", url: "https://example.com/article", align: "right" });
  for (const fields of [
    "url: javascript:alert(1)",
    "url: https://user:secret@example.com",
    "url: https://example.com\nurl: https://other.example",
    "url: https://example.com\nimage: injected",
  ]) {
    expect(() => parseMarkdownEmbed("embed:link", fields)).toThrow();
  }
});

it("preserves media fences and validates their sources and options", () => {
  const body =
    "```embed:media\ntype: video\nsrc: ./media/演示 one.mp4\ntitle: Demo\ncaption: A & B\n```";
  const source = serializeArticleDocument({ title: "Media", summary: "Summary", tags: [], body });
  expect(parseArticleDocument(source).body).toBe(body);
  expect(parseMarkdownEmbed("embed:media", "type: video\nsrc: ./media/演示 one.mp4")).toEqual({
    kind: "media",
    type: "video",
    src: "./media/%E6%BC%94%E7%A4%BA%20one.mp4",
    poster: null,
    title: "Video player",
    caption: null,
    align: "wide",
  });
  expect(
    parseMarkdownEmbed("embed:media", "type: audio\nsrc: https://example.com/audio.mp3"),
  ).toMatchObject({ type: "audio", src: "https://example.com/audio.mp3" });
  for (const fields of [
    "type: image\nsrc: photo.png",
    "type: audio",
    "src: video.mp4",
    "type: audio\nsrc: audio.mp3\nposter: cover.jpg",
    "type: video\nsrc: a.mp4\nautoplay: true",
    "type: video\nsrc: a.mp4\nsrc: b.mp4",
    "type: video\nsrc: a.mp4\nalign: center",
  ])
    expect(() => parseMarkdownEmbed("embed:media", fields)).toThrow();
  for (const src of [
    "javascript:alert(1)",
    "data:video/mp4;base64,abcd",
    "file:///tmp/video.mp4",
    "/Users/name/video.mp4",
    "//example.com/video.mp4",
    "https://user:secret@example.com/video.mp4",
    "~/Music/audio.mp3",
    "https://",
    "a.mp4#fragment",
    "C:\\media\\video.mp4",
  ]) {
    expect(() => parseMarkdownEmbed("embed:media", `type: video\nsrc: ${src}`)).toThrow();
    expect(() =>
      parseMarkdownEmbed("embed:media", `type: video\nsrc: a.mp4\nposter: ${src}`),
    ).toThrow();
  }
});
