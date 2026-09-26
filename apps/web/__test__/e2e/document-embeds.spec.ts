import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { z } from "zod";
import { serveGoogle } from "./google";

test("reads quote and Git diff dialects without losing source or executing HTML", async ({
  page,
  playwright,
  baseURL,
}, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await serveGoogle(page);
  if (testInfo.project.name.includes("reduced-motion"))
    await page.emulateMedia({ reducedMotion: "reduce" });
  if (!baseURL) throw new Error("Local Worker URL required");
  const owner = await playwright.request.newContext({
    baseURL,
    storageState: "apps/web/__test__/.auth/owner.json",
  });
  const body = [
    "## Sources and changes",
    "```embed:architecture\nalign: narrow\nflowchart LR\nsource[测试体系：Unit / 接口与存储 / Playwright E2E] --> process[Content services: permissions / versions / saving]\nprocess --> reader[ローカルエディター：原稿と素材 👩‍💻]\n```",
    "```embed:annotation\nmark: 内容优先\nnote: 让文字成为主角，也让很长的批注在手机上自然换行\ncolor: red\nurl: https://example.com/note\n---\n我的博客坚持内容优先。\n```",
    "```embed:quote\nauthor: 项目笔记\ntitle: 知识的保存\nurl: https://example.com/source\n---\n保留知识，也保留它的上下文。\n\n<script>只是原文，不执行。</script>\n```",
    '```embed:diff\ntitle: Publication change\n---\ndiff --git a/config.ts b/config.ts\n--- a/config.ts\n+++ b/config.ts\n@@ -1,2 +1,2 @@\n-const visibility = "private";\n+const visibility = "public";\n export { visibility };\n```',
  ].join("\n\n");
  let id: string;
  try {
    const response = await owner.post("/api/articles", {
      data: {
        title: `Document embeds ${testInfo.project.name}`,
        summary: "Original sources and readable code changes.",
        tags: ["daily/testing"],
        body,
      },
    });
    expect(response.status()).toBe(201);
    id = z.object({ article: z.object({ id: z.string() }) }).parse(await response.json())
      .article.id;
  } finally {
    await owner.dispose();
  }
  await page.goto(`/articles/${id}`);
  await page.evaluate(() => document.fonts.ready);
  const diagram = page.locator(".architecture-flow svg:visible");
  await expect(diagram).toHaveCount(1);
  await expect(diagram).toHaveClass(/architecture-compact/u);
  for (const node of await diagram.locator(".node").all()) {
    const bounds = await node.evaluate((element) => {
      const rect = element.querySelector("rect")?.getBoundingClientRect();
      const text = element.querySelector("text")?.getBoundingClientRect();
      if (!rect || !text) throw new Error("Missing diagram node geometry");
      return {
        left: text.left - rect.left,
        right: rect.right - text.right,
        top: text.top - rect.top,
        bottom: rect.bottom - text.bottom,
      };
    });
    for (const inset of Object.values(bounds)) expect(inset).toBeGreaterThanOrEqual(0);
  }
  await diagram.screenshot({ path: testInfo.outputPath("architecture-wrapped.png") });
  const annotation = page.locator(".markdown-embed-annotation");
  await expect(annotation.locator(".annotation-mark")).toHaveText("内容优先");
  await expect(annotation.locator(".annotation-note a")).toHaveAttribute(
    "href",
    "https://example.com/note",
  );
  const quote = page.locator(".markdown-embed-quote");
  const patch = page.locator(".markdown-embed-diff");
  await expect(quote).toContainText("保留知识，也保留它的上下文。");
  await expect(quote.locator("script")).toHaveCount(0);
  await expect(quote.locator("blockquote")).toHaveAttribute("cite", "https://example.com/source");
  await expect(patch.locator(".diff-add")).toHaveText('+const visibility = "public";');
  await expect(patch.locator(".diff-remove")).toHaveText('-const visibility = "private";');
  await patch.locator("pre").focus();
  await expect(patch.locator("pre")).toBeFocused();
  await expect(patch.locator("pre")).toHaveCSS("outline-style", "solid");
  const bounds = await patch.boundingBox();
  expect(bounds?.width).toBeGreaterThan(240);
  expect(bounds?.height).toBeGreaterThan(100);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("document-embeds.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("copies code and reads a native Twitter card", async ({
  page,
  context,
  playwright,
  baseURL,
}, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await serveGoogle(page);
  await page.route("https://pbs.twimg.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: route.request().url().includes("profile_images")
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#60796c"/><circle cx="24" cy="18" r="9" fill="#dce8e0"/><ellipse cx="24" cy="46" rx="18" ry="16" fill="#dce8e0"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#dce8e0"/><circle cx="950" cy="180" r="70" fill="#e7bf72"/><path d="M0 720V460L340 180L700 570L940 330L1280 600V720Z" fill="#60796c"/></svg>',
    }),
  );
  if (testInfo.project.name.includes("reduced-motion"))
    await page.emulateMedia({ reducedMotion: "reduce" });
  if (!baseURL) throw new Error("Local Worker URL required");
  const owner = await playwright.request.newContext({
    baseURL,
    storageState: "apps/web/__test__/.auth/owner.json",
  });
  const source = 'const message = "你好 <world>";\n  console.log(message);';
  let id: string;
  try {
    const response = await owner.post("/api/articles", {
      data: {
        title: `Code and Twitter ${testInfo.project.name}`,
        summary: "Code copying and a native post card.",
        tags: ["daily/testing"],
        body: `## Code\n\n\`\`\`ts\n${source}\n\`\`\`\n\n\`\`\`embed:twitter\nurl: https://twitter.com/Example/status/12345?s=20\n\`\`\``,
      },
    });
    expect(response.status()).toBe(201);
    id = z.object({ article: z.object({ id: z.string() }) }).parse(await response.json())
      .article.id;
  } finally {
    await owner.dispose();
  }
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`/articles/${id}`);
  const card = page.locator(".markdown-embed-twitter");
  await expect(card).toContainText("Example 作者");
  await expect(card).toContainText("推特链接与正文");
  await expect(card.getByRole("link", { name: "View on Twitter" })).toHaveAttribute(
    "href",
    "https://x.com/example/status/12345",
  );
  await expect(page.locator('script[src*="twitter"], iframe[src*="twitter"]')).toHaveCount(0);
  const media = card.getByRole("img", { name: "A landscape used to verify tweet media layout" });
  await expect(media).toBeVisible();
  expect(
    await media.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  ).toBe(true);
  expect((await media.boundingBox())?.height).toBeGreaterThan(140);
  await card.screenshot({ path: testInfo.outputPath("tweet-card.png") });
  await card.getByRole("link", { name: "View on Twitter" }).focus();
  await expect(card.getByRole("link", { name: "View on Twitter" })).toBeFocused();
  const button = page.locator(".markdown-code-block button");
  await expect(button).toHaveAttribute("aria-label", "复制代码");
  await button.focus();
  await expect(button).toBeFocused();
  await button.press("Enter");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(source);
  await expect(page.getByText("代码已复制", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    });
  });
  await button.click();
  await expect(page.getByText("无法复制代码，请重试。", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("code-twitter.png"), fullPage: true });
  expect(errors).toEqual([]);
});
