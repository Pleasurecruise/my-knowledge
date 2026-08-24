import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const errorsByPage = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name === "phone-dark-reduced-motion") {
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  errorsByPage.set(page, browserErrors);
});

test.afterEach(async ({ page }, testInfo) => {
  const errors = errorsByPage.get(page);
  if (
    testInfo.project.name === "desktop-light" &&
    testInfo.title === "surfaces the local AI Search boundary on Home search"
  ) {
    if (!errors) throw new Error("Browser error collection was not initialized");
    expect(errors.length).toBeGreaterThan(0);
    errors.length = 0;
    return;
  }
  expect(errors).toEqual([]);
});

test("renders the current Japanese translation under a Japanese interface", async ({
  page,
}, testInfo) => {
  await page.goto("/articles/extensible-knowledge-boundaries");
  await page.getByRole("button", { name: "切换语言: English" }).click();
  await page.getByRole("button", { name: "Change language: 日本語" }).click();

  await expect(page).toHaveTitle(/可扩展的知识边界/u);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/articles\/extensible-knowledge-boundaries$/u,
  );
  const openGraphImage = await page.locator('meta[property="og:image"]').getAttribute("content");
  if (!openGraphImage) throw new Error("Article Open Graph image metadata is unavailable");
  const openGraphUrl = new URL(openGraphImage);
  const openGraphResponse = await page.request.get(
    `${openGraphUrl.pathname}${openGraphUrl.search}`,
  );
  expect(openGraphResponse.status()).toBe(200);
  expect(openGraphResponse.headers()["content-type"]).toContain("image/png");
  await expect(page.locator("article")).toHaveAttribute("lang", "ja");
  await expect(
    page.getByRole("navigation", { name: "メインナビゲーション" }).getByRole("link"),
  ).toHaveCount(3);
  await expect(
    page
      .getByRole("navigation", { name: "メインナビゲーション" })
      .getByRole("link", { name: "記事", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "すべての記事" })).toBeVisible();
  await expect(page.locator("header img")).toHaveJSProperty("complete", true);
  await expect(page.locator(".callout")).toHaveCount(1);
  await expect(page.locator('pre.shiki[data-language="ts"]')).toHaveCount(1);
  await expect(page.locator('pre.shiki[data-language="ts"] .line span').first()).toHaveCSS(
    "color",
    /rgb/u,
  );
  await expect(page.getByRole("figure", { name: "Mermaid 図" }).locator("svg")).toHaveCount(1, {
    timeout: 15_000,
  });
  await expect(page.getByRole("figure", { name: "Vega-Lite グラフ" }).locator("svg")).toHaveCount(
    1,
    { timeout: 15_000 },
  );
  await expect(page.locator(".canvas-block")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "削除" })).toHaveCount(0);

  if (testInfo.project.name.startsWith("desktop")) {
    const tableOfContents = page.getByRole("navigation", { name: "目次" });
    await expect(tableOfContents).toBeVisible();
    await expect(tableOfContents).toHaveCSS("overflow-y", "auto");
    await expect(tableOfContents).toHaveCSS("scrollbar-width", "none");
    await expect(page.getByRole("complementary", { name: "読了率" })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "目次" })).toBeHidden();
    await expect(page.getByRole("complementary", { name: "読了率" })).toBeHidden();
  }

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

test("keeps the three public tabs searchable, localized, and keyboard reachable", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-light",
    "One deterministic public-flow run is enough",
  );

  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "主要导航" });
  await expect(navigation.getByRole("link")).toHaveCount(3);
  await expect(navigation.getByRole("link", { name: "首页" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { name: "搜索" })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByText("最近文章", { exact: true })).toHaveCount(0);

  const robotsResponse = await page.request.get("/robots.txt");
  expect(robotsResponse.status()).toBe(200);
  expect(await robotsResponse.text()).toContain("Disallow: /api/");
  const sitemapResponse = await page.request.get("/sitemap.xml");
  expect(sitemapResponse.status()).toBe(200);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain("/articles/extensible-knowledge-boundaries");
  expect(sitemap).not.toContain("/articles/private-deletion-fixture");
  const rssResponse = await page.request.get("/rss.xml");
  expect(rssResponse.status()).toBe(200);
  expect(rssResponse.headers()["content-type"]).toContain("application/rss+xml");
  const rss = await rssResponse.text();
  expect(rss).toContain("/articles/extensible-knowledge-boundaries");
  expect(rss).not.toContain("Private deletion fixture");
  const llmsResponse = await page.request.get("/llms.txt");
  expect(llmsResponse.status()).toBe(200);
  expect(llmsResponse.headers()["content-type"]).toContain("text/plain");
  const llms = await llmsResponse.text();
  expect(llms).toContain("/articles/extensible-knowledge-boundaries");
  expect(llms).not.toContain("Private deletion fixture");

  await page.getByRole("button", { name: "切换语言: English" }).click();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();

  const aiResponse = await page.request.post("/api/search/ai", {
    data: { query: "private knowledge" },
  });
  expect(aiResponse.status()).toBe(404);
  const privateResponse = await page.request.get("/articles/private-deletion-fixture");
  const privatePage = await privateResponse.text();
  expect(privatePage).toContain('<meta name="robots" content="noindex');
  expect(privatePage).toContain("404 · 未找到页面");
  expect(privatePage).not.toContain("Private deletion fixture");

  await page.goto("/articles");
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
  await expect(page.getByRole("search")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "可扩展的知识边界" })).toBeVisible();
  await expect(page.getByRole("link", { name: "相关实践" })).toBeVisible();
  await expect(page.getByText("Private", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "可扩展的知识边界" }).click();
  await expect(page).toHaveURL(/\/articles\/extensible-knowledge-boundaries$/u);
  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page).toHaveURL(/\/articles$/u);
  await page.goto("/graph");
  await expect(page.locator(".graph-node")).toHaveCount(2);
  const [graphTitleBox, headerBox] = await Promise.all([
    page.locator("main header").boundingBox(),
    page.getByRole("banner").locator(":scope > div").boundingBox(),
  ]);
  if (!graphTitleBox || !headerBox) throw new Error("Wide title layout was not measurable");
  expect(graphTitleBox.x).toBeCloseTo(headerBox.x, 0);
  expect(graphTitleBox.x + graphTitleBox.width).toBeCloseTo(headerBox.x + headerBox.width, 0);
  await expect(
    page.locator('[aria-live="polite"]').getByText("可扩展的知识边界", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Relationships" }).getByRole("listitem"),
  ).toHaveCount(2);
  await expect(page.getByRole("group")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveCount(0);
  const cardBounds = await page.locator('[aria-live="polite"]').boundingBox();
  const graphBounds = await page.locator(".graph-stage").boundingBox();
  const graphGridBounds = await page.locator(".graph-stage").locator("..").boundingBox();
  const relationshipBounds = await page
    .getByRole("region", { name: "Relationships" })
    .boundingBox();
  if (!cardBounds || !graphBounds || !graphGridBounds || !relationshipBounds)
    throw new Error("Graph column bounds are unavailable");
  expect(graphBounds.x).toBeGreaterThanOrEqual(graphGridBounds.x);
  expect(graphBounds.x + graphBounds.width).toBeLessThanOrEqual(
    graphGridBounds.x + graphGridBounds.width,
  );
  expect(graphBounds.y).toBeCloseTo(cardBounds.y, 0);
  expect(graphBounds.height).toBeCloseTo(
    relationshipBounds.y + relationshipBounds.height - cardBounds.y,
    0,
  );
  expect(relationshipBounds.y).toBeGreaterThanOrEqual(cardBounds.y + cardBounds.height);
  expect(
    await page
      .locator('[aria-live="polite"] .overflow-y-auto')
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

test("surfaces the local AI Search boundary on Home search", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-light",
    "One deterministic search journey is enough",
  );

  await page.goto("/");
  await page.getByRole("searchbox", { name: "搜索文章" }).fill("相关实践");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page).toHaveURL(/\?query=/u);
  await expect(page.getByText("这页暂时无法载入。")).toBeVisible();
});

test("cycles every registered interface locale", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-light",
    "One deterministic locale journey is enough",
  );

  await page.goto("/");
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
  await page.getByRole("button", { name: "查看 相关实践" }).click();
  await expect(
    page.locator('[aria-live="polite"]').getByText("相关实践", { exact: true }),
  ).toBeVisible();
  await page.locator('[aria-live="polite"]').getByRole("link", { name: "阅读文章" }).click();
  await expect(page).toHaveURL(/\/articles\/related-article$/u);
});
