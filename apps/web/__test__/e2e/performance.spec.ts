import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { serveGoogle } from "./google";
import { serveMedia } from "./media";

test("article list delivery samples", async ({ page }, testInfo) => {
  await serveGoogle(page);
  const samples: { scenario: string; duration: number }[] = [];
  for (const scenario of ["list-direct", "list-click", "list-intent"]) {
    for (let index = -3; index < 15; index++) {
      await page.goto("/explore");
      const link = page.locator('.primary-navigation a[href="/"]');
      if (scenario === "list-intent") {
        await link.hover();
        await page.waitForTimeout(300);
      }
      const start = performance.now();
      if (scenario === "list-direct") await page.goto("/", { waitUntil: "commit" });
      else await link.click();
      await expect(page.locator("main .article-list")).toBeVisible();
      if (index >= 0) samples.push({ scenario, duration: performance.now() - start });
    }
  }
  const output = testInfo.outputPath("samples.json");
  await writeFile(output, JSON.stringify(samples, null, 2));
  await testInfo.attach("samples", { path: output, contentType: "application/json" });
  for (const scenario of ["list-direct", "list-click", "list-intent"]) {
    const values = samples
      .filter((sample) => sample.scenario === scenario)
      .map((sample) => sample.duration)
      .sort((a, b) => a - b);
    console.log(JSON.stringify({ scenario, median: values[7], p95: values[14] }));
  }
});

test("article delivery samples", async ({ page }, testInfo) => {
  await serveMedia(page);
  await serveGoogle(page);
  const samples: { scenario: string; duration: number; ttfb?: number; bytes?: number }[] = [];
  for (const scenario of ["direct", "intent"]) {
    for (let index = -3; index < 15; index++) {
      await page.goto("/articles");
      const link = page.locator('main a[href="/articles/extensible-knowledge-boundaries"]').first();
      if (scenario === "intent") {
        await link.hover();
        await page.waitForTimeout(300);
      }
      const start = performance.now();
      if (scenario === "direct")
        await page.goto("/articles/extensible-knowledge-boundaries", { waitUntil: "commit" });
      else await link.click();
      await expect(page.locator(".markdown-body")).toBeVisible();
      const duration = performance.now() - start;
      const navigation = await page.evaluate(() => {
        const entry = performance.getEntriesByType("navigation")[0];
        if (!(entry instanceof PerformanceNavigationTiming)) return {};
        return { ttfb: entry.responseStart - entry.requestStart, bytes: entry.transferSize };
      });
      if (index >= 0)
        samples.push({ scenario, duration, ...(scenario === "direct" ? navigation : {}) });
    }
  }
  const output = testInfo.outputPath("samples.json");
  await writeFile(output, JSON.stringify(samples, null, 2));
  await testInfo.attach("samples", { path: output, contentType: "application/json" });
  for (const scenario of ["direct", "intent"]) {
    const values = samples
      .filter((sample) => sample.scenario === scenario)
      .map((sample) => sample.duration)
      .sort((a, b) => a - b);
    console.log(JSON.stringify({ scenario, median: values[7], p95: values[14] }));
  }
});

test("open graph image samples", async ({ page }, testInfo) => {
  await serveGoogle(page);
  await page.goto("/articles/extensible-knowledge-boundaries");
  const url = await page.locator('meta[property="og:image"]').getAttribute("content");
  if (!url) throw new Error("Missing image URL");
  const samples: { index: number; duration: number; bytes: number }[] = [];
  for (let index = -3; index < 15; index++) {
    const start = performance.now();
    const response = await page.request.get(url);
    expect(response.status()).toBe(200);
    const body = await response.body();
    samples.push({ index, duration: performance.now() - start, bytes: body.length });
    if (index === 0) await writeFile(testInfo.outputPath("cover.png"), body);
  }
  await writeFile(testInfo.outputPath("samples.json"), JSON.stringify(samples, null, 2));
  const values = samples
    .filter(({ index }) => index >= 0)
    .map(({ duration }) => duration)
    .sort((a, b) => a - b);
  console.log(JSON.stringify({ first: samples[0], median: values[7], p95: values[14] }));
});
