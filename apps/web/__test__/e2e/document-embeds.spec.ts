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
    "```embed:quote\nauthor: 项目笔记\ntitle: 知识的保存\nurl: https://example.com/source\n---\n保留知识，也保留它的上下文。\n\n<script>只是原文，不执行。</script>\n```",
    '```embed:diff\ntitle: Publication change\n---\ndiff --git a/config.ts b/config.ts\n--- a/config.ts\n+++ b/config.ts\n@@ -1,2 +1,2 @@\n-const visibility = "private";\n+const visibility = "public";\n export { visibility };\n```',
  ].join("\n\n");
  let slug: string;
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
    slug = z.object({ article: z.object({ slug: z.string() }) }).parse(await response.json())
      .article.slug;
  } finally {
    await owner.dispose();
  }
  await page.goto(`/articles/${slug}`);
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
