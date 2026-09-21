import AxeBuilder from "@axe-core/playwright";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { getPlatformProxy } from "wrangler";
import { fileURLToPath } from "node:url";
import { serveGoogle } from "./google";

const appDirectory = new URL("../../", import.meta.url);

function fixtureRow(id: string) {
  execFileSync(
    "./node_modules/.bin/wrangler",
    [
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "wrangler.test.json",
      "--persist-to",
      ".wrangler/test-state",
      "--command",
      `INSERT INTO articles (id, title, summary, contentHash, tagsJson, visibility, createdAt, updatedAt)
     VALUES ('${id}', 'Reading recovery', 'Recovery fixture', '${"a".repeat(64)}', '["daily"]', 'private', '2026-09-01', '2026-09-01')`,
    ],
    { cwd: appDirectory, stdio: "pipe" },
  );
}

test("keeps stored invalid embeds readable and editable", async ({ page }, testInfo) => {
  await serveGoogle(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  const id = randomUUID();
  const { env, dispose } = await getPlatformProxy<CloudflareEnv>({
    configPath: fileURLToPath(new URL("wrangler.test.json", appDirectory)),
    persist: { path: fileURLToPath(new URL(".wrangler/test-state/v3", appDirectory)) },
  });
  try {
    fixtureRow(id);
    await env.KNOWLEDGE_BUCKET.put(
      `knowledge/${id}/zh.md`,
      "---\ntitle: Reading recovery\nsummary: Recovery fixture\ntags: [daily]\n---\nBefore the block.\n\n```embed:article\nid: removed-target\n```\n\nAfter the block.\n",
      { customMetadata: { contentHash: "a".repeat(64) } },
    );
    await page.goto(`/articles/${id}`);
    await expect(page.locator("article")).toContainText("After the block.");
    await expect(page.locator(".markdown-block-error").getByRole("alert")).toContainText(
      "Invalid article list URL",
    );
    await page.screenshot({ path: testInfo.outputPath("invalid-embed-light.png"), fullPage: true });
    await page.locator(".article-edit").click();
    await expect(page.locator("#article-title")).toHaveValue("Reading recovery");
    await page.getByRole("button", { name: "源码", exact: true }).click();
    await expect(page.locator("textarea")).toHaveValue(/id: removed-target/u);
    expect(errors).toEqual([]);
  } finally {
    await dispose();
  }
});

test("shows recoverable error and not-found pages at reading width", async ({ page }, testInfo) => {
  await serveGoogle(page);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const id = randomUUID();
  fixtureRow(id);
  await page.goto(`/articles/${id}`);
  await expect(page.getByRole("heading", { name: "这页暂时无法载入。" })).toBeVisible();
  await page.getByRole("button", { name: "重新载入", exact: true }).focus();
  await expect(page.getByRole("button", { name: "重新载入", exact: true })).toBeFocused();
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
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`error-${theme}.png`), fullPage: true });
  }
  expect(errors.length).toBeGreaterThan(0);
  expect(
    errors.every((error) =>
      /Server Components render|Minified React error #441|500 \(Internal Server Error\)/u.test(
        error,
      ),
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "返回首页", exact: true }).click();
  await expect(page).toHaveURL(/\/$/u);
  await page.goto("/articles/missing-error-page-fixture");
  await expect(page.getByRole("heading")).toBeVisible();
  await expect(page.getByRole("link", { name: "返回首页", exact: true })).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("not-found.png"), fullPage: true });
});
