import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { serveGoogle } from "./google";
import { serveMedia } from "./media";

const errorsByPage = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name === "phone-dark-reduced-motion") {
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  await serveMedia(page);
  await serveGoogle(page);
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  errorsByPage.set(page, browserErrors);
});

test.afterEach(async ({ page }) => {
  const errors = errorsByPage.get(page);
  expect(errors).toEqual([]);
});

test("uses readable article typography without decorative icons", async ({ page }, testInfo) => {
  await page.goto("/articles/extensible-knowledge-boundaries?from=explore#content");
  await expect(page).toHaveURL(
    /\/articles\/11111111-1111-4111-8111-111111111111\?from=explore#content$/u,
  );
  await expect(page.locator(".site-masthead")).toBeHidden();
  await expect(page.getByRole("link", { name: "编辑", exact: true })).toHaveCount(0);
  const prose = page.locator("#article > .markdown-body");
  await expect(page.locator(".article-reading-page")).toHaveCSS("padding-top", "72px");
  await expect(prose).toHaveCSS("font-size", "16px");
  await expect(prose).toHaveCSS("line-height", "28.8px");
  await expect(prose).toHaveCSS("font-family", /Geist.*PingFang SC/u);
  await expect(page.locator(".heading-identity")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("reading-identity.png") });
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("prompts through Google One Tap without a login button or duplicated archive", async ({
  page,
}, testInfo) => {
  await page.goto("/explore");
  await expect(page.getByRole("button", { name: "使用 Google 登录" })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-google-prompt", "shown");
  await expect(page.locator("html")).toHaveAttribute("data-google-auto-select", "true");
  await expect(page.locator("main .article-list")).toHaveCount(0);
  await page.getByRole("searchbox", { name: "搜索文章" }).focus();
  await expect(page.locator(":focus-visible")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("search-focused.png") });
  const response = await page.request.post("/api/auth/one-tap/callback", {
    headers: { origin: "http://127.0.0.1:8787" },
    data: { idToken: "invalid-fixture-token" },
  });
  expect(response.status()).toBe(400);
  expect(response.headers()["set-cookie"]).toBeUndefined();
});

test("renders the current Japanese translation under a Japanese interface", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "切换语言: English" }).click();
  await page.getByRole("button", { name: "Change language: 日本語" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await page.goto("/articles/extensible-knowledge-boundaries");

  await expect(page).toHaveTitle(/可扩展的知识边界/u);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/articles\/11111111-1111-4111-8111-111111111111$/u,
  );
  const openGraphImage = await page.locator('meta[property="og:image"]').getAttribute("content");
  if (!openGraphImage) throw new Error("Article Open Graph image metadata is unavailable");
  const openGraphUrl = new URL(openGraphImage);
  const openGraphResponse = await page.request.get(
    `${openGraphUrl.pathname}${openGraphUrl.search}`,
  );
  expect(openGraphResponse.status()).toBe(200);
  expect(openGraphResponse.headers()["content-type"]).toContain("image/png");
  expect(openGraphResponse.headers()["cache-control"]).toBe("no-store");
  expect(openGraphUrl.searchParams.get("v")).toMatch(/-4$/u);
  await expect(page.locator("article")).toHaveAttribute("lang", "ja");
  await expect(page.locator(".markdown-embed-link a")).toHaveAttribute(
    "href",
    "https://example.com/article",
  );
  await expect(page.locator(".site-masthead")).toBeHidden();
  const returnLink = page.getByRole("link", { name: "戻る", exact: true });
  await expect(returnLink).toBeVisible();
  await expect(returnLink).toHaveAttribute("href", "/");
  const headingBox = await page.locator(".article-heading h1").boundingBox();
  const returnBox = await returnLink.boundingBox();
  if (!headingBox || !returnBox)
    throw new Error("Article title and return link were not measurable");
  expect(
    Math.abs(headingBox.y + headingBox.height / 2 - returnBox.y - returnBox.height / 2),
  ).toBeLessThan(2);
  await page.screenshot({ path: testInfo.outputPath("title-aligned-return.png") });
  await expect(page.locator(".site-identity")).toHaveCount(0);
  await expect(page.locator(".callout")).toHaveCount(1);
  await expect(page.locator('pre.shiki[data-language="ts"]')).toHaveCount(1);
  await expect(page.locator('pre.shiki[data-language="ts"] .line span').first()).toHaveCSS(
    "color",
    /rgb/u,
  );
  await expect(page.getByRole("figure", { name: "Mermaid 図" }).locator("svg")).toHaveCount(1, {
    timeout: 15_000,
  });
  const diagramNodes = page.getByRole("figure", { name: "Mermaid 図" }).locator("svg .node");
  await expect(diagramNodes).toHaveCount(3);
  await expect
    .poll(async () =>
      diagramNodes.evaluateAll((nodes) =>
        Math.min(...nodes.map((node) => node.getBoundingClientRect().width)),
      ),
    )
    .toBeGreaterThan(40);
  await expect(page.getByRole("figure", { name: "Vega-Lite グラフ" }).locator("svg")).toHaveCount(
    1,
    { timeout: 15_000 },
  );
  await expect(page.locator(".canvas-block")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "削除" })).toHaveCount(0);

  const headingIds = await page
    .locator(".markdown-body :is(h1,h2,h3,h4,h5,h6)")
    .evaluateAll((headings) => headings.map((heading) => heading.id));
  expect(headingIds.every(Boolean)).toBe(true);
  expect(new Set(headingIds).size).toBe(headingIds.length);
  await expect(page.getByRole("navigation", { name: "目次" })).toHaveCount(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  const articleBounds = await page.locator("article").boundingBox();
  if (!articleBounds) throw new Error("Article bounds are unavailable");
  const figureBounds = await page.locator(".structured-block").evaluateAll((figures) =>
    figures.map((figure) => {
      const bounds = figure.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right };
    }),
  );
  for (const bounds of figureBounds) {
    expect(bounds.left).toBeGreaterThanOrEqual(articleBounds.x - 1);
    expect(bounds.right).toBeLessThanOrEqual(articleBounds.x + articleBounds.width + 1);
  }
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    accessibility.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("article.png") });
});

test("keeps the two public tabs searchable, localized, and keyboard reachable", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-light",
    "One deterministic public-flow run is enough",
  );

  await page.goto("/explore");
  await expect(page.getByRole("navigation", { name: "主要导航" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "搜索" })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByText("最近文章", { exact: true })).toHaveCount(0);

  const robotsResponse = await page.request.get("/robots.txt");
  expect(robotsResponse.status()).toBe(200);
  expect(await robotsResponse.text()).toContain("Disallow: /api/");
  const sitemapResponse = await page.request.get("/sitemap.xml");
  expect(sitemapResponse.status()).toBe(200);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain("/articles/11111111-1111-4111-8111-111111111111");
  expect(sitemap).toContain("/explore</loc>");
  expect(sitemap).not.toContain("/graph</loc>");
  expect(sitemap).not.toContain("/articles</loc>");
  expect(sitemap).not.toContain("/articles/33333333-3333-4333-8333-333333333333");
  const rssResponse = await page.request.get("/rss.xml");
  expect(rssResponse.status()).toBe(200);
  expect(rssResponse.headers()["content-type"]).toContain("application/rss+xml");
  const rss = await rssResponse.text();
  expect(rss).toContain("/articles/11111111-1111-4111-8111-111111111111");
  expect(rss).not.toContain("Private deletion fixture");
  const llmsResponse = await page.request.get("/llms.txt");
  expect(llmsResponse.status()).toBe(200);
  expect(llmsResponse.headers()["content-type"]).toContain("text/plain");
  const llms = await llmsResponse.text();
  expect(llms).toContain("/articles/11111111-1111-4111-8111-111111111111");
  expect(llms).not.toContain("Private deletion fixture");

  await page.getByRole("button", { name: "切换语言: English" }).click();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();

  const aiResponse = await page.request.post("/api/search/ai", {
    data: { query: "private knowledge" },
  });
  expect(aiResponse.status()).toBe(404);
  const privateResponse = await page.request.get("/articles/33333333-3333-4333-8333-333333333333");
  const privatePage = await privateResponse.text();
  expect(privatePage).toContain('<meta name="robots" content="noindex');
  expect(privatePage).toContain("404 · 未找到页面");
  expect(privatePage).not.toContain("Private deletion fixture");

  await page.goto("/articles");
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
  await expect(page.getByRole("search")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Extensible knowledge boundaries" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Related practice" })).toBeVisible();
  await expect(page.getByText("Private", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Extensible knowledge boundaries" }).click();
  await expect(page).toHaveURL(/\/articles\/11111111-1111-4111-8111-111111111111$/u);
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/$/u);
  await page.goto("/graph");
  await expect(page.locator(".graph-node")).toHaveCount(2);
  const [graphTitleBox, headerBox] = await Promise.all([
    page.locator("main header").boundingBox(),
    page.locator(".page-content").boundingBox(),
  ]);
  if (!graphTitleBox || !headerBox) throw new Error("Narrow title layout was not measurable");
  expect(graphTitleBox.x).toBeCloseTo(headerBox.x, 0);
  expect(graphTitleBox.x + graphTitleBox.width).toBeCloseTo(headerBox.x + headerBox.width, 0);
  await expect(
    page.locator(".graph-details").getByText("可扩展的知识边界", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Relationships" }).getByRole("listitem"),
  ).toHaveCount(2);
  await expect(page.getByRole("group", { name: "Knowledge graph canvas" })).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  const cardBounds = await page.locator(".graph-details").boundingBox();
  const graphBounds = await page.locator(".graph-stage").boundingBox();
  const graphGridBounds = await page.locator(".graph-workspace-body").boundingBox();
  const relationshipBounds = await page
    .getByRole("region", { name: "Relationships" })
    .boundingBox();
  if (!cardBounds || !graphBounds || !graphGridBounds || !relationshipBounds)
    throw new Error("Graph column bounds are unavailable");
  expect(graphBounds.x).toBeGreaterThanOrEqual(graphGridBounds.x);
  expect(graphBounds.x + graphBounds.width).toBeLessThanOrEqual(
    graphGridBounds.x + graphGridBounds.width,
  );
  expect(cardBounds.y).toBeGreaterThanOrEqual(graphBounds.y + graphBounds.height);
  expect(relationshipBounds.y).toBeGreaterThanOrEqual(cardBounds.y + cardBounds.height);
  expect(
    await page
      .locator(".graph-details .overflow-y-auto")
      .evaluate((element) => getComputedStyle(element).scrollbarWidth),
  ).toBe("none");
  expect(
    await page
      .getByRole("region", { name: "Relationships" })
      .getByRole("list")
      .evaluate((element) => getComputedStyle(element).scrollbarWidth),
  ).toBe("none");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("graph.png") });

  await page.goto("/missing-page");
  await expect(
    page.getByRole("heading", { name: "This page has not been written down." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toBeVisible();
  const errors = errorsByPage.get(page);
  if (!errors) throw new Error("Browser error collection was not initialized");
  expect(errors).toEqual([
    "Failed to load resource: the server responded with a status of 404 (Not Found)",
  ]);
  errors.length = 0;
});

test("searches public articles without AI Search", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-light",
    "One deterministic search journey is enough",
  );

  await page.goto("/explore");
  await page.getByRole("searchbox", { name: "搜索文章" }).fill("相关实践");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page).toHaveURL(/\?query=/u);
  await expect(page.getByRole("link", { name: "相关实践", exact: true })).toBeVisible();
});

test("prefetches prose links before clicking and keeps navigation in the client", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-light",
    "One deterministic prefetch journey is enough",
  );
  await page.goto("/articles/extensible-knowledge-boundaries");
  const reference = page.locator('.markdown-body a[href="/articles/related-article"]').first();
  const requested = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname === "/articles/related-article" &&
      request.headers()["rsc"] === "1",
  );
  await reference.hover();
  const prefetch = await requested;
  const response = await prefetch.response();
  expect(response?.ok()).toBe(true);
  const navigations: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest()) navigations.push(request.url());
  });
  await reference.click();
  await expect(page).toHaveURL(/\/articles\/22222222-2222-4222-8222-222222222222$/u);
  await expect(page.locator(".article-return")).toHaveAttribute(
    "href",
    "/articles/11111111-1111-4111-8111-111111111111",
  );
  await expect(page.locator(".markdown-body")).toBeVisible();
  expect(navigations).toEqual([]);
  await page.goto("/articles/extensible-knowledge-boundaries#reference=related-article");
  await expect(reference).toBeFocused();
  await expect(reference).toBeInViewport();
});

test("cycles every registered interface locale", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-light",
    "One deterministic locale journey is enough",
  );

  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: "搜索" })).toBeVisible();
  await page.getByRole("button", { name: "切换语言: English" }).click();
  await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
  await page.getByRole("button", { name: "Change language: 日本語" }).click();
  await expect(page.getByRole("heading", { name: "検索" })).toBeVisible();
  await page.getByRole("button", { name: "言語を変更: 简体中文" }).click();
  await expect(page.getByRole("heading", { name: "搜索" })).toBeVisible();
});

test("updates the selected graph article and follows its reading action", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-light", "One deterministic graph journey is enough");

  await page.goto("/graph");
  await page.getByRole("button", { name: "明确链接", exact: true }).click();
  await expect(page.locator(".graph-edge--link")).toHaveCount(1);
  await expect(page.locator(".graph-edge--tag")).toHaveCount(0);
  await page.getByRole("button", { name: "共享标签", exact: true }).click();
  await expect(page.locator(".graph-edge--tag")).toHaveCount(1);
  await expect(page.locator(".graph-edge--link")).toHaveCount(0);
  await page.getByRole("button", { name: "全部关系" }).click();
  await page.getByRole("button", { name: "查看 相关实践" }).click();
  await expect(page.locator(".graph-details").getByText("相关实践", { exact: true })).toBeVisible();
  await page.locator(".graph-details").getByRole("link", { name: "阅读文章" }).click();
  await expect(page).toHaveURL(/\/articles\/22222222-2222-4222-8222-222222222222\?from=/u);
  await expect(page.locator(".article-return")).toHaveAttribute("href", "/explore?view=graph");
});

test("plays embedded audio and video on click and previews the opening frame", async ({
  page,
}, testInfo) => {
  await page.goto("/articles/extensible-knowledge-boundaries");
  const video = page.locator('video[aria-label="Video preview"]');
  const audio = page.locator('audio[aria-label="Audio recording"]');
  const custom = page.locator('video[aria-label="Custom video"]');
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute("src", "./media-preview/video.mp4#t=0.001");
  await expect(video).toHaveJSProperty("readyState", 4);
  await expect(video).toHaveJSProperty("paused", true);
  await expect(video).toHaveJSProperty("videoWidth", 640);
  const frame = await video.evaluate((element: HTMLVideoElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Frame inspection is unavailable");
    context.drawImage(element, 0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data);
  });
  expect(frame[0]).toBeLessThan(80);
  expect(frame[1]).toBeGreaterThan(100);
  expect(frame[3]).toBe(255);
  await expect(custom).toHaveAttribute("poster", "./media-preview/cover.svg");
  const bounds = await video.boundingBox();
  if (!bounds) throw new Error("Video controls are not visible");
  await video.click({ position: { x: 22, y: bounds.height - 48 } });
  await expect(video).toHaveJSProperty("paused", false);
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(0.2);
  await video.focus();
  await page.keyboard.press("Space");
  await expect(video).toHaveJSProperty("paused", true);
  await expect(audio).toHaveAttribute(
    "src",
    "https://raw.githubusercontent.com/fixture/media/main/media-preview/audio.mp3",
  );
  await audio.scrollIntoViewIfNeeded();
  await audio.click({ position: { x: 22, y: 27 } });
  await expect(audio).toHaveJSProperty("paused", false);
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime))
    .toBeGreaterThan(0.2);
  await audio.focus();
  await page.keyboard.press("Space");
  await expect(audio).toHaveJSProperty("paused", true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
  await video.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `.agents/evidence/media-${testInfo.project.name}.png` });
  const accessibility = await new AxeBuilder({ page }).include(".markdown-embed-media").analyze();
  expect(accessibility.violations).toEqual([]);
});

test("matches the design theme and preserves it through a keyboard toggle", async ({
  page,
}, testInfo) => {
  await page.goto("/articles/extensible-knowledge-boundaries");
  await page.evaluate(() => document.fonts.ready);
  const dark = testInfo.project.name.includes("dark");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    dark ? "rgb(28, 32, 31)" : "rgb(246, 246, 242)",
  );
  await expect(page.locator(".markdown-body")).toHaveCSS("font-size", "16px");
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "切换主题" });
  await page.keyboard.press("Tab");
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    dark ? "rgb(246, 246, 242)" : "rgb(28, 32, 31)",
  );
  await page.goto("/articles/extensible-knowledge-boundaries");
  await expect(page.locator(".site-masthead")).toBeHidden();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    dark ? "rgb(246, 246, 242)" : "rgb(28, 32, 31)",
  );
  await page.screenshot({ path: testInfo.outputPath("theme.png") });
});

test("keeps the shared layout, type and shapes consistent across main pages", async ({
  page,
}, testInfo) => {
  for (const { name, path } of [
    { name: "home", path: "/" },
    { name: "explore", path: "/explore" },
    { name: "graph", path: "/explore?view=graph" },
  ]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    if (path === "/") {
      await expect(page.locator(".site-identity")).toHaveText("Pleasure1234");
      await expect(page.locator(".site-identity img")).toHaveCSS("border-radius", "50%");
    } else {
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("main h1")).toHaveCSS(
        "font-size",
        testInfo.project.name.startsWith("phone") ? "22px" : "24px",
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".site-controls")).toHaveCSS("position", "relative");
    if (path === "/explore") {
      await expect(page.locator(".exploration-toggle a").first()).toHaveCSS("width", "32px");
      await expect(page.locator(".exploration-toggle")).toHaveCSS("border-width", "0px");
      await expect(page.locator('form[role="search"]')).toHaveCSS("border-radius", "7px");
      await expect(page.locator('form[role="search"] button')).toHaveCSS("border-radius", "9999px");
    }
    if (path === "/") await expect(page.locator("main .article-list")).toBeVisible();
    await expect(page.locator(".page-shell")).toHaveCSS(
      "max-width",
      testInfo.project.name.startsWith("phone") ? "690px" : "778px",
    );
    if (path === "/explore?view=graph") {
      const label = await page.locator(".graph-node text").first().boundingBox();
      expect(label?.height).toBeGreaterThanOrEqual(12);
    }
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      accessibility.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
    if (path === "/explore?view=graph") {
      const canvas = await page.locator(".graph-stage").boundingBox();
      const response = await page.request.get("/explore?view=graph");
      const html = await response.text();
      // Inspect the actual loading markup emitted by the Worker, before its streamed content replaces it.
      await page.evaluate((source) => {
        const initialDocument = new DOMParser().parseFromString(source, "text/html");
        const loading = initialDocument.querySelector(".graph-loading")?.closest(".page-shell");
        const main = document.querySelector("main");
        if (!loading || !main) throw new Error("Graph loading markup is missing");
        main.replaceChildren(loading);
      }, html);
      await expect(page.locator(".exploration-toggle a")).toHaveCount(2);
      await expect(page.locator(".exploration-toggle")).toBeVisible();
      const loadingCanvas = await page.locator(".graph-loading .graph-stage").boundingBox();
      expect(loadingCanvas?.x).toBe(canvas?.x);
      expect(loadingCanvas?.width).toBe(canvas?.width);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("graph-loading.png"), fullPage: true });
    }
  }
});

test("switches exploration views without repeating One Tap and preserves the query", async ({
  page,
}) => {
  await page.goto("/explore");
  await expect(page.locator("html")).toHaveAttribute("data-google-prompt-count", "1");
  const documents: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.resourceType() === "document")
      documents.push(request.url());
  });
  await page.getByRole("searchbox").fill("knowledge");
  await page.locator('form[role="search"]').getByRole("button").click();
  await expect(page).toHaveURL(/query=knowledge/u);
  for (let index = 0; index < 3; index++) {
    await page.locator(".exploration-toggle").getByRole("link", { name: "知识图谱" }).click();
    await expect(page).toHaveURL(/query=knowledge&view=graph/u);
    await expect(page.locator(".graph-workspace")).toBeVisible();
    await page
      .locator(".exploration-toggle")
      .getByRole("link", { name: "搜索", exact: true })
      .click();
    await expect(page.getByRole("searchbox")).toHaveValue("knowledge");
  }
  await page.goBack();
  await expect(page.locator(".graph-workspace")).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("searchbox")).toHaveValue("knowledge");
  expect(documents).toEqual([]);
  await expect(page.locator("html")).toHaveAttribute("data-google-prompt-count", "1");
  await page.goto("/graph");
  await expect(page).toHaveURL(/\/explore\?view=graph$/u);
});

test("retains search context and inherits Home settings without reading controls", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "切换语言: English" }).click();
  await page.goto("/?query=边界");
  await expect(page).toHaveURL(/\/explore\?query=/u);
  await expect(page.locator(".article-preview").first()).toContainText(
    "Extensible Knowledge Boundaries",
  );
  await page.locator(".article-preview").first().click();
  await expect(page.locator(".site-masthead")).toBeHidden();
  await expect(page.locator(".site-controls")).toBeHidden();
  await expect(page.locator(".reading-controls")).toHaveCount(0);
  await expect(page.locator("article")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("figure", { name: "Mermaid diagram", exact: true }).locator("svg"),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("reading-controls.png"), fullPage: true });
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/explore\?query=/u);
  await expect(page.getByRole("searchbox")).toHaveValue("边界");
});

test("keeps One Tap failures out of the reading surface", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-google-prompt-count", "1");
  await page.evaluate(() => document.dispatchEvent(new Event("test-google-credential")));
  await expect(page.locator(".auth-toast")).toHaveCount(0);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.locator(".auth-feedback")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("sign-in-toast.png") });
  await page.goto("/explore");
  await expect(page).toHaveURL(/\/explore$/u);
  await expect(page.locator(".auth-toast")).toHaveCount(0, { timeout: 7000 });
  const errors = errorsByPage.get(page);
  expect(errors).toHaveLength(1);
  expect(errors?.[0]).toContain("400");
  if (errors) errors.length = 0;
});

test("switches article list titles and summaries with the Home language setting", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const entry = page.locator(
    '.article-preview[href="/articles/11111111-1111-4111-8111-111111111111"]',
  );
  await expect(entry).toContainText("可扩展的知识边界");
  await page.getByRole("button", { name: "切换语言: English" }).click();
  await expect(entry).toContainText("Extensible Knowledge Boundaries");
  await expect(entry).toContainText("Use a stable content model");
  await page.getByRole("button", { name: "Change language: 日本語" }).click();
  await expect(entry).toContainText("拡張可能な知識の境界");
  await page.screenshot({ path: testInfo.outputPath("localized-list.png"), fullPage: true });
  await entry.click();
  await expect(page.locator("article")).toHaveAttribute("lang", "ja");
  await expect(page.locator(".site-controls")).toBeHidden();
});

test("does not show a toast when Google skips its prompt", async ({ page }) => {
  await serveGoogle(page, false);
  await page.goto("/");
  await expect(page.locator(".auth-toast")).toHaveCount(0);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.locator(".auth-toast")).toHaveCount(0, { timeout: 7000 });
});

test("keeps invalid-origin login failures out of the reading surface", async ({ page }) => {
  await page.route("**/api/auth/one-tap/callback", (route) =>
    route.fulfill({ status: 403, json: { message: "Invalid origin" } }),
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-google-prompt-count", "1");
  await page.evaluate(() => document.dispatchEvent(new Event("test-google-credential")));
  await expect(page.locator(".auth-toast")).toHaveCount(0);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.locator(".auth-feedback")).toHaveCount(0);
  await expect(page.locator(".auth-toast")).toHaveCount(0, { timeout: 7000 });
  const errors = errorsByPage.get(page);
  expect(errors).toHaveLength(1);
  expect(errors?.[0]).toContain("403");
  if (errors) errors.length = 0;
});

test("keeps navigation compact and copies a clean article link", async ({
  page,
  context,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".site-extra-actions")).toBeHidden();
  await expect(page.getByRole("link", { name: "探索", exact: true })).toHaveCount(0);
  await expect(page.locator(".article-visibility").first()).toHaveText("public");
  await expect(page.locator(".article-visibility", { hasText: "private" })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("content-first-home.png"), fullPage: true });
  await expect(page.locator(".site-menu")).toHaveCount(0);
  await expect(page.locator(".site-preferences")).toBeVisible();
  await expect(page.getByRole("link", { name: "新建", exact: true })).toHaveCount(0);
  await page.goto("/articles/extensible-knowledge-boundaries?from=explore#source");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "复制链接", exact: true }).click();
  await expect(page.getByText("链接已复制", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    new URL("/articles/11111111-1111-4111-8111-111111111111", page.url()).href,
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: () => Promise.reject(new DOMException("Clipboard denied", "NotAllowedError")),
    });
  });
  await page.getByRole("button", { name: "复制链接", exact: true }).click();
  await expect(page.getByText("复制失败，请重试。", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("copy-failure.png") });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
