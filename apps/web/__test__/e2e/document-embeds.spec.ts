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
