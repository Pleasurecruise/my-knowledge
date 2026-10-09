import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request } from "@playwright/test";
import { z } from "zod";

import { serveGoogle } from "./google";
import { serveMedia } from "./media";

const errorsByPage = new WeakMap<Page, string[]>();

test("title-only save request samples", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const created = await page.request.post("/api/articles", {
    data: {
      title: "Save measurements",
      summary: "Synthetic fixture",
      tags: ["daily"],
      body: "## Section\n\nBody unchanged.\n\n```typescript\nconst value = 1;\n```",
    },
  });
  expect(created.status()).toBe(201);
  const { article } = z
    .object({ article: z.object({ id: z.string() }) })
    .parse(await created.json());
  const path = `/articles/${article.id}`;
  const samples: { duration: number; requests: string[] }[] = [];
  for (let index = -2; index < 7; index++) {
    await page.goto(`${path}?edit=1`);
    await page.locator("#article-title").fill(`Save measurements ${index}`);
    const requests: string[] = [];
    const record = (request: Request) => {
      const url = new URL(request.url());
      if (url.pathname === path || url.pathname === `/api/articles/${article.id}`)
        requests.push(
          `${request.method()} ${url.pathname}${url.searchParams.has("edit") ? "?edit=1" : ""}`,
        );
    };
    page.on("request", record);
    const start = performance.now();
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.locator("article h1")).toHaveText(`Save measurements ${index}`);
    const duration = performance.now() - start;
    await page.waitForTimeout(300);
    page.off("request", record);
    expect(requests).toEqual([`PATCH /api/articles/${article.id}`, `GET ${path}`]);
    if (index >= 0) samples.push({ duration, requests });
  }
  await writeFile(testInfo.outputPath("save-samples.json"), JSON.stringify(samples, null, 2));
  console.log(JSON.stringify({ saveSamples: samples }));
});

test("keeps failed drafts and rejects duplicate Save clicks", async ({ page }) => {
  await page.goto("/articles/new");
  await page.getByLabel("标题", { exact: true }).fill("Retry draft");
  await page.getByLabel("一句话摘要").fill("Synthetic retry fixture");
  await page.getByLabel("标签", { exact: true }).fill("daily");
  const source = page.getByRole("textbox", { name: "源码", exact: true });
  await source.fill("Draft must survive failed saves.");
  let requests = 0;
  await page.route("**/api/articles", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    requests += 1;
    if (requests === 1) return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    return route.continue();
  });
  const save = page.getByRole("button", { name: "保存", exact: true });
  await save.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.locator("#article").getByRole("alert")).toBeVisible();
  await expect(source).toHaveValue("Draft must survive failed saves.");
  await expect(save).toBeEnabled();
  expect(requests).toBe(1);
  await save.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.locator("article h1")).toHaveText("Retry draft");
  expect(requests).toBe(2);
  const errors = errorsByPage.get(page);
  expect(errors).toHaveLength(1);
  expect(errors?.[0]).toContain("503");
  if (errors) errors.length = 0;
});

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

test.afterEach(async ({ page }) => {
  const errors = errorsByPage.get(page);
  expect(errors).toEqual([]);
});

test("searches private articles by keyword without exposing them anonymously", async ({
  page,
  browser,
}, testInfo) => {
  await page.goto("/explore");
  await page.getByRole("searchbox", { name: "搜索文章" }).fill("testing/privacy");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.getByRole("link", { name: "私密删除夹具", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("owner-keyword-search.png"), fullPage: true });
  const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const response = await anonymous.request.get(page.url());
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain("私密删除夹具");
  } finally {
    await anonymous.close();
  }
});

test("shows owner-only knowledge, visibility, and deletion controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.getByRole("button", { name: "更多操作", exact: true }).click();
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
    expect(body).not.toContain("33333333-3333-4333-8333-333333333333");
    expect(body).not.toContain("私密删除夹具");
    expect(body).not.toContain("Private deletion fixture");
  }

  await page.goto("/articles/33333333-3333-4333-8333-333333333333");
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
  await page.goto("/articles/11111111-1111-4111-8111-111111111111");
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

test("expands owner controls beside the preferences", async ({ page, request }, testInfo) => {
  expect((await request.put("/api/settings/api-key")).status()).toBe(200);
  await page.goto("/");

  await page.locator(".site-actions").hover();
  await expect(page.locator(".site-extra-actions")).toBeHidden();
  await page.getByRole("button", { name: "更多操作", exact: true }).click();
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
  await page.getByRole("button", { name: "更多操作", exact: true }).click();
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
  const rest = await request.get("/api/articles?tags=engineering&limit=10", {
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
  const searched = z.object({ articles: z.array(z.object({ id: z.string() })) }).parse(
    await (
      await request.get("/api/articles?search=engineering&limit=10", {
        headers: { authorization },
      })
    ).json(),
  );
  expect(searched.articles.map(({ id }) => id)).toEqual(restBody.articles.map(({ id }) => id));
  const tags = z
    .object({ tags: z.array(z.object({ path: z.string(), count: z.number() })) })
    .parse(await (await request.get("/api/tags", { headers: { authorization } })).json());
  expect(tags.tags.map(({ path }) => path)).toContain("engineering");

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
  execFileSync(
    process.execPath,
    ["apps/web/__test__/scripts/mcp-contract.ts", "http://127.0.0.1:8787/api/mcp"],
    {
      env: { ...process.env, MY_KNOWLEDGE_API_KEY: credential.apiKey },
      timeout: 20_000,
      stdio: "pipe",
    },
  );
});

test("previews Markdown without changing the draft", async ({ page }, testInfo) => {
  await page.goto("/articles/new");
  await page.getByLabel("标题", { exact: true }).fill("编辑器流程草稿");
  await page.getByLabel("一句话摘要").fill("这是编辑器流程草稿的测试摘要。");
  const source = page.getByRole("textbox", { name: "源码", exact: true });
  const markdown =
    "## 编辑器标题\n\n**编辑器正文**\n\n| A | B |\n| - | - |\n| 一 | 二 |\n\n```embed:article\nurl: https://knowledge.you-find.me/articles/example\n```";
  await source.fill(markdown);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
      document.documentElement.classList.toggle("dark", value === "dark");
    }, theme);
    await page.getByRole("button", { name: "预览", exact: true }).click();
    const preview = page.locator(".milkdown .ProseMirror");
    await expect(preview).toHaveAttribute("contenteditable", "false");
    await expect(preview.locator("h2")).toHaveText("编辑器标题");
    await expect(preview.locator("strong")).toHaveText("编辑器正文");
    await expect(preview.locator("table")).toBeVisible();
    await page.keyboard.press("Tab");
    await preview.focus();
    await expect(page.locator(":focus-visible")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`editor-preview-${theme}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "源码", exact: true }).click();
    await expect(source).toHaveValue(markdown);
    await source.focus();
    await page.screenshot({
      path: testInfo.outputPath(`editor-source-${theme}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "取消", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: "放弃未保存的修改？" })).toBeVisible();
  await dialog.getByRole("button", { name: "放弃修改" }).click();
  await expect(page).toHaveURL(/\/$/u);
});

test("keeps a disconnected deletion visible and retryable", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/articles/*", async (route) => {
    if (route.request().method() !== "DELETE") return route.continue();
    attempts += 1;
    if (attempts === 1) return route.abort("internetdisconnected");
    return route.fulfill({ status: 204 });
  });
  await page.goto("/articles/33333333-3333-4333-8333-333333333333?edit=1");
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
  await page.getByRole("button", { name: "More actions", exact: true }).click();
  await page.getByRole("link", { name: "New", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(`Authoring ${testInfo.project.name}`);
  await page.getByLabel("One-sentence summary").fill("An authoring integration fixture.");
  await page.getByLabel("Tags", { exact: true }).fill("daily");
  await page
    .getByRole("textbox", { name: "Markdown source", exact: true })
    .fill("中文正文。保存以后继续编辑。");
  await page.getByRole("button", { name: "Markdown source", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Markdown source", exact: true });
  await expect(source).toHaveValue("中文正文。保存以后继续编辑。");
  await source.fill("中文正文。**保存以后继续编辑。**");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".milkdown .ProseMirror strong")).toHaveText("保存以后继续编辑。");
  await page.getByRole("button", { name: "More actions", exact: true }).click();
  await page.getByRole("navigation").getByRole("link", { name: "Explore" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.getByRole("button", { name: "More actions", exact: true }).click();
  await expect(page.locator(".milkdown .ProseMirror")).toContainText("中文正文");
  await page.screenshot({ path: testInfo.outputPath("authoring-new.png"), fullPage: true });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("article")).toContainText("中文正文");
  const articleUrl = page.url();
  expect(new URL(articleUrl).pathname).toMatch(/^\/articles\/[0-9a-f-]{36}$/u);
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("locale") === "zh");
  const chineseSource = page.getByRole("textbox", { name: "源码", exact: true });
  await expect(page.locator(".site-preferences")).toBeHidden();
  await page.getByLabel("标题", { exact: true }).fill("Renamed article");
  await page.getByLabel("一句话摘要").fill("The edited summary.");
  await page.getByRole("textbox", { name: "源码", exact: true }).fill("更新后的中文正文。");
  await page.getByRole("button", { name: "源码", exact: true }).click();
  await expect(chineseSource).toHaveValue("更新后的中文正文。");
  await chineseSource.fill("更新后的中文正文。\n\n![A preserved image](/logo.png)");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(page.getByRole("img", { name: "A preserved image" })).toHaveAttribute(
    "src",
    "/logo.png",
  );
  await page.getByRole("button", { name: "源码", exact: true }).click();
  await expect(chineseSource).toHaveValue(/!\[A preserved image\]/u);
  await page.screenshot({ path: testInfo.outputPath("authoring-edit.png"), fullPage: true });
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.locator("article")).toContainText("更新后的中文正文");
  await expect(page).toHaveURL(articleUrl);
  await expect(page.getByRole("heading", { name: "Renamed article", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("authoring-saved.png"), fullPage: true });
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(chineseSource).toHaveValue("更新后的中文正文。\n\n![A preserved image](/logo.png)");
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.classList.add("dark");
  });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await chineseSource.focus();
  await expect(chineseSource).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("authoring-source-dark.png"), fullPage: true });
});

test("keeps article references one-way when the referring article is withdrawn", async ({
  page,
  browser,
}, testInfo) => {
  const title = `Article links ${testInfo.project.name}`;
  const created = await page.request.post("/api/articles", {
    data: {
      title,
      summary: "An article URL relationship fixture.",
      tags: ["daily"],
      body: "```embed:article\nurl: https://knowledge.you-find.me/articles/22222222-2222-4222-8222-222222222222\nalign: narrow\n```",
    },
  });
  expect(created.status()).toBe(201);
  const { article } = z
    .object({
      article: z.object({
        id: z.string(),
        contentHash: z.string(),
        updatedAt: z.string(),
      }),
    })
    .parse(await created.json());
  const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const target = "/articles/22222222-2222-4222-8222-222222222222";
    const publicHtml = await (await anonymous.request.get(target)).text();
    expect(publicHtml).not.toContain(title);
    expect(await (await anonymous.request.get(`/articles/${article.id}`)).text()).toContain(title);
    const hidden = await page.request.patch(`/api/articles/${article.id}`, {
      data: {
        expectedHash: article.contentHash,
        expectedUpdatedAt: article.updatedAt,
        visibility: "private",
      },
    });
    expect(hidden.status()).toBe(200);
    const withdrawn = await anonymous.request.get(`/articles/${article.id}`);
    const withdrawnHtml = await withdrawn.text();
    expect(withdrawnHtml).not.toContain(title);
    expect(withdrawnHtml).not.toContain(`data-article-id="${article.id}"`);
    expect(withdrawn.status()).toBe(404);
    expect(await (await anonymous.request.get(target)).text()).not.toContain(title);
    await page.goto(target);
    await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);
    await page.goto(`/articles/${article.id}`);
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
      body: `${"Reading context before the reference.\n\n".repeat(40)}Articles to read.\n\n\`\`\`embed:article\nhttps://knowledge.you-find.me/articles/11111111-1111-4111-8111-111111111111\nhttps://knowledge.you-find.me/articles/22222222-2222-4222-8222-222222222222\n\`\`\``,
    },
  });
  expect(created.status()).toBe(201);
  const { article } = z
    .object({ article: z.object({ id: z.string(), contentHash: z.string() }) })
    .parse(await created.json());
  await page.goto(`/articles/${article.id}`);
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
  await expect(back).toHaveAttribute("href", `/articles/${article.id}`);
  const titleBox = await page.locator(".article-heading h1").boundingBox();
  const backBox = await back.boundingBox();
  expect(titleBox).not.toBeNull();
  expect(backBox).not.toBeNull();
  if (titleBox && backBox)
    expect(
      Math.abs(titleBox.y + titleBox.height / 2 - backBox.y - backBox.height / 2),
    ).toBeLessThan(2);
  await back.click();
  await expect(page).toHaveURL(new RegExp(`/articles/${article.id}$`));
  await expect(cards.locator("strong").first()).toHaveText(target.editions.zh.title);
  await cards.locator("a").first().click();
  await expect(page).toHaveURL(new RegExp(`/articles/${target.id}$`));
  await page.goto(`/articles/${article.id}#reference=${target.id}`);
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
  await expect(page).toHaveURL((url) => url.searchParams.get("edit") === "1");
  expect(patches).toEqual([]);
  const before = await (await request.get(`/api/articles/${article.id}`)).json();
  expect(before.article.visibility).toBe("public");
  await page.locator("#article-summary").fill("Edited description saved with visibility");
  await page.screenshot({
    path: testInfo.outputPath("visibility-draft-light.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/articles/${article.id}#reference=${target.id}$`));
  const saved = await (await request.get(`/api/articles/${article.id}`)).json();
  expect(saved.article.visibility).toBe("private");
  expect(saved.article.editions.zh.summary).toBe("Edited description saved with visibility");
  expect(patches).toHaveLength(1);
  await page.goto(`/articles/${article.id}?edit=1`);
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
  await expect(page).toHaveURL(new RegExp(`/articles/${article.id}$`));
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
    .object({ article: z.object({ id: z.string() }) })
    .parse(await response.json());
  await page.goto(`/articles/${article.id}`);
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

test("serializes concurrent state changes and completes deletion", async ({ page }) => {
  const created = await page.request.post("/api/articles", {
    data: {
      title: "Concurrency fixture",
      summary: "Synthetic",
      tags: ["daily"],
      body: "Synthetic content",
    },
  });
  expect(created.status()).toBe(201);
  const schema = z.object({
    article: z.object({ id: z.string(), contentHash: z.string(), updatedAt: z.string() }),
  });
  const { article } = schema.parse(await created.json());
  const endpoint = `/api/articles/${article.id}`;
  const version = { expectedHash: article.contentHash, expectedUpdatedAt: article.updatedAt };
  const changes = await Promise.all([
    page.request.patch(endpoint, { data: { ...version, visibility: "private" } }),
    page.request.patch(endpoint, { data: { ...version, visibility: "public" } }),
  ]);
  expect(changes.map((response) => response.status()).sort((left, right) => left - right)).toEqual([
    200, 409,
  ]);
  const current = schema.parse(await (await page.request.get(endpoint)).json()).article;
  const currentVersion = {
    expectedHash: current.contentHash,
    expectedUpdatedAt: current.updatedAt,
  };
  expect((await page.request.delete(endpoint, { data: currentVersion })).status()).toBe(204);
});

test("keeps the account popover accessible in both themes", async ({ page }, testInfo) => {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "更多操作", exact: true }).click();
    const trigger = page.getByRole("button", { name: "打开账户菜单", exact: true });
    await trigger.click();
    const popup = page.locator('[data-slot="popover-content"]');
    await expect(popup).toBeVisible();
    await expect(popup.getByRole("button", { name: "退出登录" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`account-${colorScheme}.png`) });
    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test("edits current translations and redirects missing or stale editions to Chinese", async ({
  page,
  context,
  browser,
}) => {
  const editionSchema = z.object({
    title: z.string(),
    summary: z.string(),
    markdown: z.string(),
  });
  const responseSchema = z.object({
    article: z.object({
      id: z.uuid(),
      contentHash: z.string(),
      updatedAt: z.iso.datetime(),
      visibility: z.enum(["public", "private"]),
      editions: z.object({ zh: editionSchema }).catchall(editionSchema),
    }),
  });
  const document = (title: string, body: string) =>
    `---\ntitle: "${title}"\nsummary: "Locale fixture"\ntags: [daily]\n---\n\n${body}`;
  const created = await page.request.post("/api/articles", {
    data: {
      documents: {
        zh: document("中文标题", "中文正文"),
        en: document("English title", "English body"),
        ja: document("日本語タイトル", "日本語本文"),
      },
    },
  });
  expect(created.status()).toBe(201);
  const { article } = responseSchema.parse(await created.json());
  const endpoint = `/api/articles/${article.id}`;
  const path = `/articles/${article.id}`;
  for (const locale of ["en", "ja"]) {
    await context.addCookies([
      { name: "my-knowledge:locale", value: locale, url: "http://127.0.0.1:8787" },
    ]);
    const before = responseSchema.parse(await (await page.request.get(endpoint)).json()).article;
    await page.goto(`${path}?edit=1`);
    await expect(page.locator(".site-masthead")).toBeHidden();
    await expect(page.locator("#article")).toHaveAttribute("lang", locale);
    const edition = before.editions[locale];
    if (!edition) throw new Error(`Fixture translation is missing: ${locale}`);
    await expect(page.locator("#article-title")).toHaveValue(edition.title);
    await expect(page.locator("#article-tags")).toHaveAttribute("readonly", "");
    await page.locator("#article-title").fill(`Edited ${locale}`);
    await page.locator("#article-visibility").click();
    await page
      .getByRole("option", { name: locale === "en" ? "Private" : "公開", exact: true })
      .click();
    await page
      .getByRole("button", { name: locale === "en" ? "Save" : "保存", exact: true })
      .click();
    await expect(page.locator("article h1")).toHaveText(`Edited ${locale}`);
    const after = responseSchema.parse(await (await page.request.get(endpoint)).json()).article;
    expect(after.visibility).toBe(locale === "en" ? "private" : "public");
    const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      expect((await anonymous.request.get(endpoint)).status()).toBe(401);
      const response = await anonymous.request.get(path);
      const html = await response.text();
      if (locale === "en") {
        expect(html).not.toContain("Edited en");
        expect(html).not.toContain("中文标题");
        expect(response.status()).toBe(404);
      } else expect(html).toContain("中文标题");
    } finally {
      await anonymous.close();
    }
    expect(after.contentHash).toBe(before.contentHash);
    expect(after.updatedAt).not.toBe(before.updatedAt);
    expect(after.editions.zh).toEqual(before.editions.zh);
    expect(after.editions[locale === "en" ? "ja" : "en"]).toEqual(
      before.editions[locale === "en" ? "ja" : "en"],
    );
    expect(after.editions[locale]?.title).toBe(`Edited ${locale}`);
    expect(
      (
        await page.request.patch(endpoint, {
          data: {
            locale,
            title: "Stale",
            summary: "Stale",
            body: "Stale",
            expectedHash: before.contentHash,
            expectedUpdatedAt: before.updatedAt,
          },
        })
      ).status(),
    ).toBe(409);
  }
  const current = responseSchema.parse(await (await page.request.get(endpoint)).json()).article;
  expect(
    (
      await page.request.patch(endpoint, {
        data: {
          title: "更新中文",
          summary: "更新",
          tags: ["daily"],
          body: "中文已更新",
          expectedHash: current.contentHash,
          expectedUpdatedAt: current.updatedAt,
        },
      })
    ).status(),
  ).toBe(200);
  await page.goto(`${path}?edit=1&from=%2Fexplore%3Fquery%3Ddaily`);
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("locale") === "zh" &&
      url.searchParams.get("from") === "/explore?query=daily",
  );
  await expect(page.locator("#article")).toHaveAttribute("lang", "zh");
  await expect(page.locator("#article-title")).toHaveValue("更新中文");
  await expect(page.getByRole("button", { name: "保存", exact: true })).toBeVisible();
  const stale = responseSchema.parse(await (await page.request.get(endpoint)).json()).article;
  expect(
    (
      await page.request.patch(endpoint, {
        data: {
          locale: "ja",
          title: "No recreation",
          summary: "No recreation",
          body: "No recreation",
          expectedHash: stale.contentHash,
          expectedUpdatedAt: stale.updatedAt,
        },
      })
    ).status(),
  ).toBe(409);
  expect(
    responseSchema.parse(await (await page.request.get(endpoint)).json()).article.editions.ja,
  ).toBeUndefined();
});
