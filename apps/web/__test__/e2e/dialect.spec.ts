import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { z } from "zod";

import { serveGoogle } from "./google";

test("compiles footnotes and math with working article anchors", async ({
  page,
  playwright,
  baseURL,
}, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await serveGoogle(page);
  if (testInfo.project.name === "phone-dark-reduced-motion") {
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  if (!baseURL) throw new Error("Dialect browser tests require the local Worker URL");
  const owner = await playwright.request.newContext({
    baseURL,
    storageState: "apps/web/__test__/.auth/owner.json",
  });
  let slug: string;
  try {
    const response = await owner.post("/api/articles", {
      data: {
        title: `Markdown compiler ${testInfo.project.name}`,
        summary: "Footnote anchors and mathematical source stay consistent.",
        tags: ["daily/testing"],
        body: "[^note]:\n    ## Footnote detail\n\n    Footnote text.\n\n## Main section\n\nA reference[^note].\n\nInline $[[math-only]]$.\n\n$$\n<x> + y\n$$",
      },
    });
    expect(response.status()).toBe(201);
    slug = z.object({ article: z.object({ slug: z.string() }) }).parse(await response.json())
      .article.slug;
  } finally {
    await owner.dispose();
  }
  await page.goto(`/articles/${slug}`);
  await expect(page.locator("#main-section")).toHaveText("Main section");
  await expect(page.locator("#footnote-detail")).toHaveText("Footnote detail");
  await expect(page.locator(".katex")).toHaveCount(2);
  await expect(page.locator('.markdown-body a[href*="math-only"]')).toHaveCount(0);
  const reference = page.locator("a[data-footnote-ref]");
  const target = await reference.getAttribute("href");
  expect(target).toBe("#user-content-fn-note");
  await reference.focus();
  await expect(reference).toBeFocused();
  await reference.press("Enter");
  await expect(page).toHaveURL(/#user-content-fn-note$/u);
  await expect(page.locator('[id="user-content-fn-note"]')).toBeVisible();
  await page.locator("a[data-footnote-backref]").click();
  await expect(page).toHaveURL(/#user-content-fnref-note$/u);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("markdown-compiler.png"), fullPage: true });
  expect(errors).toEqual([]);
});
