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
    for (const source of [
      "mark: missing\nnote: Note\n---\nBody",
      "mark: word\nnote: Note\n---\nword word",
      "mark: word\nnote: Note\ncolor: invalid\n---\nword",
      "mark: word\nnote: Note\nurl: javascript:alert(1)\n---\nword",
      "mark: word\nnote: Note\nnote: Duplicate\n---\nword",
    ])
      expect(() => parseMarkdownEmbed("embed:annotation", source)).toThrow();
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

it("rejects superseded article fields instead of accepting overrides", () => {
  for (const source of [
    "id: article-123",
    "title: Story\nhttps://example.com/story",
    "description: Summary\nhttps://example.com/story",
  ])
    expect(() => parseMarkdownEmbed("embed:article", source)).toThrow();
});

it("parses only explicit article fences as URL lists", () => {
  const source =
    "https://knowledge.you-find.me/articles/one\n- https://knowledge.you-find.me/articles/two\nhttps://knowledge.you-find.me/articles/one";
  expect(parseMarkdownEmbed("embed:article", source)).toEqual({
    kind: "articleList",
    align: "wide",
    urls: [
      "https://knowledge.you-find.me/articles/one",
      "https://knowledge.you-find.me/articles/two",
      "https://knowledge.you-find.me/articles/one",
    ],
  });
  expect(parseMarkdownEmbed("text", source)).toBeUndefined();
  for (const invalid of [
    "",
    "javascript:alert(1)",
    "https://user:pass@example.com",
    "https://example.com prose",
    "https://example.com\nid: mixed",
    Array(51).fill("https://example.com").join("\n"),
  ])
    expect(() => parseMarkdownEmbed("embed:article", invalid)).toThrow();
});

it.each(["left", "right", "wide", "narrow"])(
  "supports %s across card and media syntax",
  (align) => {
    for (const [kind, body] of [
      ["article", "https://example.com/a\n- https://example.com/b"],
      ["article", "  https://example.com/a"],
      ["article", "url: https://example.com/a"],
      ["link", "url: https://example.com"],
      ["media", "type: audio\nsrc: ./audio.mp3"],
      ["media", "type: video\nsrc: ./video.mp4"],
      ["github", "repo: owner/repo"],
      ["stock", "code: AAPL"],
      ["architecture", "flowchart LR\nA[Client] --> B[Service]"],
      ["storyboard", "title: Flow\nstep: Capture | Save\nstep: Read | Recall"],
      [
        "architecture",
        '<svg viewBox="0 0 100 100"><title>Flow</title><desc>Request path</desc></svg>',
      ],
      [
        "storyboard",
        '<svg viewBox="0 0 100 100"><title>Flow</title><desc>Reading path</desc></svg>',
      ],
    ])
      expect(parseMarkdownEmbed(`embed:${kind}`, `align: "${align}"\n${body}`)?.align).toBe(align);
  },
);
it("rejects duplicate, unknown and empty article-list alignment", () => {
  for (const source of [
    "align: left\nalign: narrow\nhttps://example.com/a",
    "align: center\nhttps://example.com/a",
    "align: narrow",
  ])
    expect(() => parseMarkdownEmbed("embed:article", source)).toThrow();
});

it("normalizes workspace url fields to article lists and rejects mixed or duplicate targets", () => {
  const url = "https://knowledge.you-find.me/articles/%E6%96%87%E7%AB%A0";
  expect(parseMarkdownEmbed("embed:article", `url: "${url}"\nalign: narrow`)).toEqual({
    kind: "articleList",
    urls: [url],
    align: "narrow",
  });
  for (const source of [
    `url: ${url}\nurl: ${url}`,
    `url: ${url}\n${url}`,
    `${url}\nurl: ${url}`,
    "url:",
    "url: javascript:alert(1)",
    "url: https://user:pass@example.com",
  ])
    expect(() => parseMarkdownEmbed("embed:article", source)).toThrow();
});

it("treats math source as math during submission validation", () => {
  expect(() => validateMarkdown("$$\n<x> + y\n$$")).not.toThrow();
});

it("rejects malformed percent encoding in article URLs at the embed boundary", () => {
  expect(() => parseMarkdownEmbed("embed:article", "https://example.com/articles/%E0%A4")).toThrow(
    "encoding",
  );
});

it("normalizes Twitter post URLs and rejects non-post or unsafe embeds", () => {
  for (const host of [
    "x.com",
    "www.x.com",
    "twitter.com",
    "www.twitter.com",
    "mobile.twitter.com",
  ]) {
    expect(
      parseMarkdownEmbed(
        "embed:twitter",
        `url: https://${host}/Example/status/12345?s=20#media\nalign: narrow`,
      ),
    ).toEqual({
      kind: "twitter",
      url: "https://x.com/example/status/12345",
      align: "narrow",
    });
  }
  for (const url of [
    "https://x.com/example",
    "https://x.com/example/status/nope",
    "https://x.com.evil.com/example/status/1",
    "http://x.com/example/status/1",
    "https://user:pass@x.com/example/status/1",
    "https://x.com:444/example/status/1",
    "https://x.com/example/status/1/photo/1",
    "javascript:alert(1)",
  ]) {
    expect(() => parseMarkdownEmbed("embed:twitter", `url: ${url}`)).toThrow();
  }
  expect(() =>
    parseMarkdownEmbed("embed:twitter", "url: https://x.com/example/status/1\nscript: injected"),
  ).toThrow("Unsupported");
  expect(() =>
    parseMarkdownEmbed(
      "embed:twitter",
      "url: https://x.com/example/status/1\nurl: https://x.com/example/status/2",
    ),
  ).toThrow("Duplicate");
});
