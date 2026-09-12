import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  projects: [{ name: "performance", testMatch: /performance\.spec\.ts/u }],
  timeout: 240_000,
  use: { ...config.use, viewport: { width: 1440, height: 1000 }, colorScheme: "light" },
});
