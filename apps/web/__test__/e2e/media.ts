import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";

export async function serveMedia(page: Page) {
  await page.route("**/media-preview/**", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").at(-1);
    const media = [
      { name: "video.mp4", type: "video/mp4" },
      { name: "audio.wav", type: "audio/wav" },
      { name: "cover.svg", type: "image/svg+xml" },
    ].find((item) => item.name === name);
    if (!media) {
      await route.abort();
      return;
    }
    await route.fulfill({
      contentType: media.type,
      body: await readFile(new URL(`../fixtures/media/${media.name}`, import.meta.url)),
    });
  });
}
