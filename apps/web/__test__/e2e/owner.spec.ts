import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";

import { serveGoogle } from "./google";
import { serveMedia } from "./media";

const errorsByPage = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
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

test.afterEach(async ({ page }, testInfo) => {
  const errors = errorsByPage.get(page);
  if (
    testInfo.project.name === "owner-desktop-light" &&
    testInfo.title === "keeps deletion retryable when the local AI Search boundary is unavailable"
  ) {
    if (!errors) throw new Error("Browser error collection was not initialized");
    expect(errors).toHaveLength(1);
    const error = errors[0];
    if (!error) throw new Error("Expected the deletion request to report a 503 console error");
    expect(error).toContain("500 (Internal Server Error)");
    return;
  }
  expect(errors).toEqual([]);
});

test("shows owner-only knowledge, visibility, and deletion controls", async ({ page }) => {
  await page.goto("/articles");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.locator(".site-expander").click();
  await expect(page.getByRole("link", { name: "新建" })).toBeVisible();
  await expect(page.getByRole("link", { name: "私密删除夹具" })).toBeVisible();
  await page.getByRole("button", { name: "切换语言: English" }).click();
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New", exact: true })).toBeVisible();

  for (const path of ["/rss.xml", "/llms.txt", "/sitemap.xml", "/robots.txt"]) {
    const response = await page.request.get(path);
    expect(response.status()).toBe(200);
    const body = await response.text();
    if (path !== "/robots.txt")
      expect(body).toContain("/articles/11111111-1111-4111-8111-111111111111");
    expect(body).not.toContain("private-deletion-fixture");
    expect(body).not.toContain("私密删除夹具");
    expect(body).not.toContain("Private deletion fixture");
  }

  await page.goto("/articles/private-deletion-fixture");
  await expect(page).toHaveTitle("Article not found · my knowledge");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/u);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Private deletion fixture" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Visibility" }).locator('[data-slot="select-value"]'),
  ).toHaveText("Private");
  await expect(page.getByRole("button", { name: "Withdraw" })).toHaveCount(0);
});

test("keeps article editing aligned with the title without a masthead", async ({
  page,
}, testInfo) => {
  await page.goto("/articles/extensible-knowledge-boundaries");
  await expect(page.locator(".site-masthead")).toBeHidden();
  const edit = page.getByRole("link", { name: "编辑", exact: true });
  await expect(edit).toBeVisible();
  await expect(edit).toHaveText("");
  await expect(edit.locator("svg")).toHaveCount(1);
  await expect(edit).toHaveCSS("border-width", "0px");
  await expect(edit).toHaveAttribute(
    "href",
    "/articles/11111111-1111-4111-8111-111111111111?edit=1",
  );
  const title = page.locator(".article-heading h1");
  const editBox = await edit.boundingBox();
  const titleBox = await title.boundingBox();
  if (!editBox || !titleBox) throw new Error("Article controls were not measurable");
  expect(editBox.height).toBeGreaterThanOrEqual(testInfo.project.name.includes("phone") ? 36 : 32);
  expect(editBox.x).toBeGreaterThanOrEqual(titleBox.x + titleBox.width);
  expect(Math.abs(editBox.y + editBox.height / 2 - titleBox.y - titleBox.height / 2)).toBeLessThan(
    2,
  );
  await page.screenshot({ path: testInfo.outputPath("article-edit.png") });
  await edit.focus();
  await expect(edit).toBeFocused();
  await expect(page.locator(":focus-visible")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("article-edit-focused.png") });
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "标题", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page).toHaveURL(/\/articles\/11111111-1111-4111-8111-111111111111$/u);
  await expect(edit).toBeVisible();
});

test("keeps the owner graph inside the narrow shell with hidden scrollbars", async ({
  page,
}, testInfo) => {
  await page.goto("/graph");
  await expect(page.locator(".graph-loading")).toHaveCount(0);
  const stage = page.locator(".graph-stage");
  const grid = stage.locator("..");
  const related = page.getByRole("region", { name: "关系列表" }).getByRole("list");
  const [stageBounds, gridBounds] = await Promise.all([stage.boundingBox(), grid.boundingBox()]);
  if (!stageBounds || !gridBounds) throw new Error("Graph bounds are unavailable");
  expect(stageBounds.x).toBeGreaterThanOrEqual(gridBounds.x);
  expect(stageBounds.x + stageBounds.width).toBeLessThanOrEqual(gridBounds.x + gridBounds.width);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  if (testInfo.project.name === "owner-desktop-light") {
    await expect(related).toHaveCSS("scrollbar-width", "none");
    await expect(page.locator(".graph-details .overflow-y-auto")).toHaveCSS(
      "scrollbar-width",
      "none",
    );
  }
});

test("expands owner controls beside the preferences", async ({ page, request }, testInfo) => {
  expect((await request.put("/api/settings/api-key")).status()).toBe(200);
  await page.goto("/");

  await page.locator(".site-actions").hover();
  await expect(page.locator(".site-extra-actions")).toBeHidden();
  await page.locator(".site-expander").click();
  const credentialAction = page.getByRole("button", { name: "重新生成 API 密钥" });
  const themeAction = page.getByRole("button", { name: "切换主题" });
  await expect(credentialAction).toBeVisible();
  await expect(page.locator(".article-visibility", { hasText: "private" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "新建", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("owner-header.png") });
  const [credentialBounds, themeBounds] = await Promise.all([
    credentialAction.boundingBox(),
    themeAction.boundingBox(),
  ]);
  if (!credentialBounds || !themeBounds) throw new Error("Header action bounds are unavailable");
  expect(Math.abs(credentialBounds.y - themeBounds.y)).toBeLessThan(3);

  await credentialAction.click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "当前 my-knowledge 密钥将立即失效并被替换。",
  );
  await page.getByRole("button", { name: "取消" }).click();
});

test("recovers API key status and shows first-generation failures", async ({ page }, testInfo) => {
  let statusRequests = 0;
  let generationRequests = 0;
  await page.route("**/api/settings/api-key", async (route) => {
    if (route.request().method() === "GET") {
      statusRequests += 1;
      await route.fulfill({
        status: statusRequests === 1 ? 503 : 200,
        json: statusRequests === 1 ? { error: "Unavailable" } : { configured: false },
      });
      return;
    }
    expect(route.request().method()).toBe("POST");
    generationRequests += 1;
    await route.fulfill({
      status: generationRequests === 1 ? 503 : 200,
      json:
        generationRequests === 1
          ? { error: "Unavailable" }
          : { apiKey: `sk-${"a".repeat(43)}`, createdAt: "2026-09-12T00:00:00.000Z" },
    });
  });
  await page.goto("/");
  await page.locator(".site-expander").click();
  const retry = page.getByRole("button", { name: "无法读取 API 密钥状态，点击重试。" });
  await expect(retry).toBeEnabled();
  await retry.click();
  const generate = page.getByRole("button", { name: "生成 API 密钥", exact: true });
  await generate.click();
  await expect(page.locator(".auth-feedback")).toContainText("无法生成 API 密钥，请重试。");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("api-key-failure.png") });
  await generate.click();
  await expect(page.getByRole("alertdialog")).toContainText(`sk-${"a".repeat(43)}`);
  await expect(page.locator(".auth-feedback")).toHaveCount(0);
  expect(statusRequests).toBe(2);
  expect(generationRequests).toBe(2);
  const errors = errorsByPage.get(page);
  expect(errors).toHaveLength(2);
  for (const error of errors ?? []) expect(error).toContain("503");
  if (errors) errors.length = 0;
});

test("shares the generated Bearer credential across REST and MCP", async ({
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "owner-desktop-light", "One API contract run is enough");
  const credential = z
    .object({ apiKey: z.string() })
    .parse(await (await request.put("/api/settings/api-key")).json());
  const authorization = `Bearer ${credential.apiKey}`;
  const rest = await request.get("/api/articles?tag=engineering&limit=10", {
    headers: { authorization },
  });
  expect(rest.status()).toBe(200);
  const restBody = z
    .object({ articles: z.array(z.object({ id: z.string() })) })
    .parse(await rest.json());
  expect(restBody.articles.map(({ id }) => id)).toEqual([
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
  ]);

  const mcp = await request.post("/api/mcp", {
    headers: {
      authorization,
      "content-type": "application/json",
      "mcp-method": "server/discover",
      "mcp-protocol-version": "2026-07-28",
    },
    data: {
      jsonrpc: "2.0",
      id: 1,
      method: "server/discover",
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientCapabilities": {},
        },
      },
    },
  });
  expect(mcp.status()).toBe(200);
  const mcpBody = z
    .object({ result: z.object({ supportedVersions: z.array(z.string()) }) })
    .parse(await mcp.json());
  expect(mcpBody.result.supportedVersions).toEqual(["2026-07-28"]);
});

test("opens the owner editor, uses a slash command, and discards the draft", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "owner-desktop-light",
    "One editor interaction run is enough",
  );

  await page.goto("/articles/new");
  const toolbar = page.getByRole("toolbar", { name: "格式工具" });
  await expect(toolbar).toBeVisible();
  const [editorBox, headerBox, tagsBox, toolbarBox] = await Promise.all([
    page.getByRole("region", { name: "正文" }).boundingBox(),
    page.locator("#article > div").first().boundingBox(),
    page.getByLabel("标签").boundingBox(),
    toolbar.boundingBox(),
  ]);
  if (!editorBox || !headerBox || !tagsBox || !toolbarBox)
    throw new Error("New article layout was not measurable");
  expect(editorBox.x).toBeCloseTo(headerBox.x, 0);
  expect(editorBox.x + editorBox.width).toBeCloseTo(headerBox.x + headerBox.width, 0);
  expect(tagsBox.x + tagsBox.width).toBeGreaterThan(toolbarBox.x + toolbarBox.width - 2);
  await page.getByLabel("标题").fill("编辑器流程草稿");
  await page.getByLabel("一句话摘要").fill("这是编辑器流程草稿的测试摘要。");
  await page.getByLabel("标签").fill("engineering/editor");
  const editor = page.locator(".tiptap");
  await editor.click();
  await page.keyboard.type("/");
  const slashMenu = page.getByRole("menu", { name: "斜杠命令" });
  await expect(slashMenu).toBeVisible();
  await slashMenu.getByRole("menuitem", { name: /Heading 1/u }).click();
  await page.keyboard.type("编辑器标题");
  await page.keyboard.press("Enter");
  await page.keyboard.type("编辑器正文");
  await expect(page.getByRole("button", { name: "保存" })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("editor-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("editor-phone.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "取消" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: "放弃未保存的修改？" })).toBeVisible();
  await dialog.getByRole("button", { name: "放弃修改" }).click();
  await expect(page).toHaveURL(/\/$/u);
});

test("keeps deletion retryable when the local AI Search boundary is unavailable", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "owner-desktop-light", "One destructive local-boundary run");

  await page.goto("/articles/private-deletion-fixture");
  await page.getByRole("link", { name: "编辑" }).click();
  await page.getByRole("button", { name: "删除" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: "删除这篇文章？" })).toBeVisible();
  await dialog.getByRole("button", { name: "删除" }).click();
  await expect(page.getByRole("alert")).toHaveText("文章删除失败，请稍后重试。");
  await expect(page).toHaveURL(/\/articles\/33333333-3333-4333-8333-333333333333/u);
  await expect(page.locator('#article-visibility [data-slot="select-value"]')).toHaveText("私密");
});

test("keeps a disconnected deletion visible and retryable", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/articles/*", async (route) => {
    if (route.request().method() !== "DELETE") return route.continue();
    attempts += 1;
    if (attempts === 1) return route.abort("internetdisconnected");
    return route.fulfill({ status: 204 });
  });
  await page.goto("/articles/private-deletion-fixture?edit=1");
  await page.getByRole("button", { name: "删除", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "删除", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("文章删除失败，请稍后重试。");
  await expect(dialog.getByRole("button", { name: "删除", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page).toHaveURL(/\/$/u);
  expect(attempts).toBe(2);
  const errors = errorsByPage.get(page);
  expect(errors).toHaveLength(1);
  expect(errors?.[0]).toContain("ERR_INTERNET_DISCONNECTED");
  if (errors) errors.length = 0;
});

test("creates and edits Chinese content through an English interface and guards navigation", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "切换语言: English" }).click();
  await page.locator(".site-expander").click();
  await page.getByRole("link", { name: "New", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(`Authoring ${testInfo.project.name}`);
  await page.getByLabel("One-sentence summary").fill("An authoring integration fixture.");
  await page.getByLabel("Tags", { exact: true }).fill("daily");
  await page.locator(".tiptap").fill("中文正文。保存以后继续编辑。");
  await page.getByRole("button", { name: "Markdown source", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Markdown source", exact: true });
  await expect(source).toHaveValue("中文正文。保存以后继续编辑。");
  await source.fill("中文正文。**保存以后继续编辑。**");
  await page.getByRole("button", { name: "Rich text", exact: true }).click();
  await expect(page.locator(".tiptap strong")).toHaveText("保存以后继续编辑。");
  await page.locator(".site-expander").click();
  await page.getByRole("navigation").getByRole("link", { name: "Explore" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.locator(".site-expander").click();
  await expect(page.locator(".tiptap")).toContainText("中文正文");
  await page.screenshot({ path: testInfo.outputPath("authoring-new.png"), fullPage: true });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("article")).toContainText("中文正文");
  const articleUrl = page.url();
  expect(new URL(articleUrl).pathname).toMatch(/^\/articles\/[0-9a-f-]{36}$/u);
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page.locator(".site-preferences")).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill("Renamed article");
  await page.getByLabel("One-sentence summary").fill("The edited summary.");
  await page.locator(".tiptap").fill("更新后的中文正文。");
  await page.getByRole("button", { name: "Markdown source", exact: true }).click();
  await expect(source).toHaveValue("更新后的中文正文。");
  await source.fill("更新后的中文正文。\n\n![A preserved image](/logo.png)");
  await page.getByRole("button", { name: "Rich text", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("cannot be preserved");
  await expect(source).toHaveValue(/!\[A preserved image\]/u);
  await page.screenshot({ path: testInfo.outputPath("authoring-edit.png"), fullPage: true });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("article")).toContainText("更新后的中文正文");
  await expect(page).toHaveURL(articleUrl);
  await expect(page.getByRole("heading", { name: "Renamed article", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("authoring-saved.png"), fullPage: true });
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(source).toHaveValue("更新后的中文正文。\n\n![A preserved image](/logo.png)");
  await page.getByRole("button", { name: "Switch theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await source.focus();
  await expect(source).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("authoring-source-dark.png"), fullPage: true });
});

test("persists article URL backlinks and hides a withdrawn referring article", async ({
  page,
  browser,
}, testInfo) => {
  const title = `Article links ${testInfo.project.name}`;
  const created = await page.request.post("/api/articles", {
    data: {
      title,
      summary: "An article URL relationship fixture.",
      tags: ["daily"],
      body: "```embed:article\nurl: https://knowledge.you-find.me/articles/related-article\nalign: narrow\n```",
    },
  });
  expect(created.status()).toBe(201);
  const { article } = z
    .object({ article: z.object({ id: z.string(), contentHash: z.string(), slug: z.string() }) })
    .parse(await created.json());
  const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const target = "/articles/22222222-2222-4222-8222-222222222222";
    const publicHtml = await (await anonymous.request.get(target)).text();
    expect(publicHtml).not.toContain(title);
    expect(await (await anonymous.request.get(`/articles/${article.slug}`)).text()).toContain(
      title,
    );
    const hidden = await page.request.patch(`/api/articles/${article.id}`, {
      data: { expectedHash: article.contentHash, visibility: "private" },
    });
    expect(hidden.status()).toBe(200);
    expect(await (await anonymous.request.get(target)).text()).not.toContain(title);
    await page.goto(target);
    await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);
    await page.goto(`/articles/${article.slug}`);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  } finally {
    await anonymous.close();
  }
});

test("renders article-list metadata cards and stages visibility until Save", async ({
  page,
  request,
}, testInfo) => {
  const created = await request.post("/api/articles", {
    data: {
      title: `Article card editor ${testInfo.project.name}`,
      summary: "Card and visibility fixture",
      tags: ["daily"],
      body: `${"Reading context before the reference.\n\n".repeat(40)}Articles to read.\n\n\`\`\`embed:article\nhttps://knowledge.you-find.me/articles/11111111-1111-4111-8111-111111111111\nhttps://knowledge.you-find.me/articles/related-article\n\`\`\``,
    },
  });
  expect(created.status()).toBe(201);
  const { article } = z
    .object({ article: z.object({ id: z.string(), slug: z.string(), contentHash: z.string() }) })
    .parse(await created.json());
  await page.goto(`/articles/${article.slug}`);
  const cards = page.locator(".markdown-article-list");
  const target = z
    .object({
      article: z.object({
        editions: z.object({ zh: z.object({ title: z.string(), summary: z.string() }) }),
        id: z.string(),
      }),
    })
    .parse(
      await (await request.get("/api/articles/11111111-1111-4111-8111-111111111111")).json(),
    ).article;
  await expect(cards.locator("strong").first()).toHaveText(target.editions.zh.title);
  await expect(cards.locator(".embed-link p").first()).toHaveText(target.editions.zh.summary);
  await expect(cards.locator("a").first()).toHaveAttribute("href", `/articles/${target.id}`);
  await expect(cards).not.toContainText("https://");
  await cards.locator("a").first().focus();
  await page.screenshot({
    path: testInfo.outputPath("article-list-cards-light.png"),
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await cards.locator("a").first().click();
  await expect(page).toHaveURL(new RegExp(`/articles/${target.id}$`));
  await page.reload();
  const back = page.locator(".article-return");
  await expect(back).toHaveAttribute("href", `/articles/${article.slug}`);
  const titleBox = await page.locator(".article-heading h1").boundingBox();
  const backBox = await back.boundingBox();
  expect(titleBox).not.toBeNull();
  expect(backBox).not.toBeNull();
  if (titleBox && backBox)
    expect(
      Math.abs(titleBox.y + titleBox.height / 2 - backBox.y - backBox.height / 2),
    ).toBeLessThan(2);
  await back.click();
  await expect(page).toHaveURL(new RegExp(`/articles/${article.slug}$`));
  await expect(cards.locator("strong").first()).toHaveText(target.editions.zh.title);
  await cards.locator("a").first().click();
  await page.goto(`/articles/${article.slug}#reference=${target.id}`);
  await expect(cards.locator("a").first()).toBeFocused();
  await expect(cards.locator("a").first()).toBeInViewport();
  await page.reload();
  await expect(cards.locator("a").first()).toBeFocused();
  await expect(cards.locator("a").first()).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("backlink-position.png") });
  await page.locator(".article-edit").click();
  await expect(page.locator("#article-title")).toBeVisible();
  const patches: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "PATCH") patches.push(req.url());
  });
  const visibility = page.locator("#article-visibility");
  await visibility.focus();
  await visibility.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("visibility-select-light.png"),
  });
  await page.getByRole("option", { name: "私密", exact: true }).click();
  await expect(visibility).toBeFocused();
  await expect(page).toHaveURL(/edit=1$/u);
  expect(patches).toEqual([]);
  const before = await (await request.get(`/api/articles/${article.id}`)).json();
  expect(before.article.visibility).toBe("public");
  await page.locator("#article-summary").fill("Edited description saved with visibility");
  await page.screenshot({
    path: testInfo.outputPath("visibility-draft-light.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/articles/${article.slug}#reference=${target.id}$`));
  const saved = await (await request.get(`/api/articles/${article.id}`)).json();
  expect(saved.article.visibility).toBe("private");
  expect(saved.article.editions.zh.summary).toBe("Edited description saved with visibility");
  expect(patches).toHaveLength(1);
  await page.goto(`/articles/${article.slug}?edit=1`);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.classList.add("dark");
  });
  await page.locator("#article-visibility").click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("visibility-select-dark.png"),
  });
  await page.getByRole("option", { name: "公开", exact: true }).click();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/articles/${article.slug}$`));
  const published = await (await request.get(`/api/articles/${article.id}`)).json();
  expect(published.article.visibility).toBe("public");
  expect(published.article.contentHash).toBe(saved.article.contentHash);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.classList.add("dark");
  });
  await page.screenshot({
    path: testInfo.outputPath("article-list-cards-dark.png"),
    fullPage: true,
  });
});

test("aligns article, link, audio and video cards at every supported width", async ({
  page,
  request,
}, testInfo) => {
  const alignments = ["left", "right", "wide", "narrow"];
  const body = alignments
    .flatMap((align) => [
      `## ${align}`,
      `\`\`\`embed:article\nalign: ${align}\nurl: https://knowledge.you-find.me/articles/22222222-2222-4222-8222-222222222222\n\`\`\``,
      `\`\`\`embed:link\nalign: ${align}\nurl: https://example.com/article\n\`\`\``,
      `\`\`\`embed:media\nalign: ${align}\ntype: audio\nsrc: ./media-preview/audio.mp3\n\`\`\``,
      `\`\`\`embed:media\nalign: ${align}\ntype: video\nsrc: ./media-preview/video.mp4\nposter: ./media-preview/cover.svg\n\`\`\``,
    ])
    .join("\n\n");
  const response = await request.post("/api/articles", {
    data: {
      title: `Alignment ${testInfo.project.name}`,
      summary: "Alignment fixture",
      tags: ["daily"],
      body,
    },
  });
  expect(response.status()).toBe(201);
  const { article } = z
    .object({ article: z.object({ slug: z.string() }) })
    .parse(await response.json());
  await page.goto(`/articles/${article.slug}`);
  await expect(page.locator(".markdown-article-list strong")).toHaveCount(4);
  await expect(page.locator(".markdown-body")).not.toContainText("Article unavailable");
  await page.locator("audio, video").evaluateAll((players) => {
    for (const player of players) {
      if (player instanceof HTMLMediaElement) {
        player.preload = "metadata";
        player.load();
      }
    }
  });
  await expect
    .poll(() =>
      page
        .locator("audio, video")
        .evaluateAll((players) =>
          players.every((player) => player instanceof HTMLMediaElement && player.readyState >= 2),
        ),
    )
    .toBe(true);
  const container = await page.locator(".markdown-body").boundingBox();
  if (!container) throw new Error("Markdown was not measurable");
  for (const align of alignments) {
    const blocks = page.locator(`.markdown-body > .markdown-embed-${align}`);
    await expect(blocks).toHaveCount(4);
    for (const block of await blocks.all()) {
      const box = await block.boundingBox();
      if (!box) throw new Error("Aligned card was not measurable");
      const width = align === "wide" ? container.width : Math.min(container.width, 512);
      expect(Math.abs(box.width - width)).toBeLessThan(2);
      const offset =
        align === "right"
          ? container.width - width
          : align === "narrow"
            ? (container.width - width) / 2
            : 0;
      expect(Math.abs(box.x - container.x - offset)).toBeLessThan(2);
    }
  }
  await page.locator(".markdown-article-list a").first().focus();
  await expect(page.locator(".markdown-article-list a").first()).toBeFocused();
  for (const theme of ["light", "dark"]) {
    await page.emulateMedia({
      colorScheme: theme === "light" ? "light" : "dark",
      reducedMotion: "reduce",
    });
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
      document.documentElement.classList.toggle("dark", value === "dark");
    }, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`alignment-${theme}.png`), fullPage: true });
  }
});
