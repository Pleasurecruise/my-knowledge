import type { Page } from "@playwright/test";

// Exercise our GIS integration without contacting Google or using real credentials.
export async function serveGoogle(page: Page, displayed = true) {
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.google = { accounts: { id: {
      initialize(options) {
        document.documentElement.dataset.googleClient = options.client_id;
        document.documentElement.dataset.googleAutoSelect = String(options.auto_select);
        document.addEventListener("test-google-credential", () => options.callback({ credential: "invalid-fixture-token" }), { once: true });
      },
      prompt(notify) {
        document.documentElement.dataset.googlePrompt = "shown";
        document.documentElement.dataset.googlePromptCount = String(Number(document.documentElement.dataset.googlePromptCount || 0) + 1);
        notify({ isNotDisplayed: () => ${!displayed} });
      }
    } } };`,
    }),
  );
}
