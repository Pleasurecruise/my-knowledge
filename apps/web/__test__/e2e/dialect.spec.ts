import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { z } from "zod";

import { serveGoogle } from "./google";

test("renders footnotes, math and keyboard-scrollable tables", async ({
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
  let id: string;
  try {
    const response = await owner.post("/api/articles", {
      data: {
        title: `Markdown compiler ${testInfo.project.name}`,
        summary: "Footnote anchors and mathematical source stay consistent.",
        tags: ["daily/testing"],
        body: "[^note]:\n    ## Footnote detail\n\n    Footnote text.\n\n## Main section\n\nA reference[^note].\n\nInline $[[math-only]]$.\n\n$$\n<x> + y\n$$\n\n| Label | Value |\n| --- | --- |\n| 短标签 | Short value |\n\n| Long label | Value |\n| --- | --- |\n| LongLabelLongLabelLongLabelLongLabelLongLabelLongLabelLongLabelLongLabelLongLabelLongLabelLongLabelLongLabel | Readable content |",
      },
    });
    expect(response.status()).toBe(201);
    id = z.object({ article: z.object({ id: z.string() }) }).parse(await response.json())
      .article.id;
  } finally {
    await owner.dispose();
  }
  await page.goto(`/articles/${id}`);
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
  const tables = page.locator(".markdown-table-scroll");
  await expect(tables).toHaveCount(2);
  expect(
    await tables.nth(0).evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  const wide = tables.nth(1);
  expect(await wide.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await tables.nth(0).focus();
  await page.keyboard.press("Tab");
  await expect(wide).toBeFocused();
  await expect(wide).toHaveCSS("outline-style", "solid");
  await wide.press("ArrowRight");
  await expect.poll(() => wide.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await wide.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect(wide.getByRole("cell", { name: "Readable content" })).toBeInViewport();
  await wide.screenshot({ path: testInfo.outputPath("table-scrolled.png") });
  await wide.evaluate((element) => {
    element.scrollLeft = 0;
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("markdown-compiler.png"), fullPage: true });
  expect(errors).toEqual([]);
});
