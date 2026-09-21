import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { z } from "zod";
import { serveGoogle } from "./google";

test("renders selected stickers inline and preserves shortcode examples", async ({
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
  // The local rate-limit fixture header must never reach third-party Cloudflare hosts.
  await page.route(
    /^https:\/\/(?:stickers\.fullyst\.com|assets\.stickers\.wiki|cdn\.combot\.online)\//u,
    async (route) => {
      const headers = { ...route.request().headers() };
      delete headers["cf-connecting-ip"];
      await route.continue({ headers });
    },
  );
  if (testInfo.project.name.includes("reduced-motion"))
    await page.emulateMedia({ reducedMotion: "reduce" });
  if (!baseURL) throw new Error("Local Worker URL required");
  const owner = await playwright.request.newContext({
    baseURL,
    storageState: process.env.STICKER_AUTH_STATE || "apps/web/__test__/.auth/owner.json",
  });
  let id: string;
  try {
    const response = await owner.post("/api/articles", {
      data: {
        title: `Image shortcodes ${testInfo.project.name}`,
        summary: "Inline sticker rendering and literal Markdown examples.",
        tags: ["daily/testing"],
        body: "## 表情包\n\n撕梓咩 :suzume5_01: 白圣女 :baishengnv_01: 结束。\n\n相邻贴纸 :suzume5_30::baishengnv_117:。\n\n灯火橘 :denghuoju8_01::denghuoju8_16: 呆猫 :daimao2_01::daimao2_20:。\n\n`示例 :suzume5_01:`\n\n```text\n:baishengnv_01:\n```\n\n未知 :missing_01:",
      },
    });
    expect(response.status()).toBe(201);
    id = z.object({ article: z.object({ id: z.string() }) }).parse(await response.json())
      .article.id;
  } finally {
    await owner.dispose();
  }
  await page.goto(`/articles/${id}`);
  const stickers = page.locator("img.markdown-emoji");
  await expect(stickers).toHaveCount(8);
  for (const sticker of await stickers.all()) {
    await sticker.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        sticker.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
      )
      .toBe(true);
    await expect(sticker).toHaveCSS("display", "inline-block");
    await expect(sticker).toHaveAttribute("referrerpolicy", "no-referrer");
    const box = await sticker.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.width).toBeLessThanOrEqual(96);
    expect(box?.height).toBeLessThanOrEqual(96);
    if ((await sticker.getAttribute("src"))?.startsWith("https://cdn.combot.online/")) {
      expect(box?.width).toBeLessThanOrEqual(64);
      expect(box?.height).toBeLessThanOrEqual(64);
    }
  }
  await expect(page.locator("code").first()).toHaveText("示例 :suzume5_01:");
  await expect(page.locator(".markdown-body")).toContainText(":missing_01:");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).include(".markdown-body").analyze()).violations).toEqual(
    [],
  );
  await page.screenshot({ path: testInfo.outputPath("stickers.png"), fullPage: true });
  expect(errors).toEqual([]);
});
