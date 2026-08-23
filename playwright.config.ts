import { defineConfig } from "@playwright/test";
import authFixture from "./apps/web/__test__/fixtures/auth.json" with { type: "json" };

const baseURL = "http://127.0.0.1:8787";
const workerCommand = [
  "apps/web/node_modules/.bin/wrangler dev --local --persist-to apps/web/.wrangler/state --config apps/web/wrangler.json",
  `--var BETTER_AUTH_URL:${baseURL}`,
  `--var ALLOWED_EMAIL:${authFixture.email}`,
  `--var BETTER_AUTH_SECRET:${authFixture.secret}`,
  `--var GOOGLE_CLIENT_ID:${authFixture.googleClientId}`,
  `--var GOOGLE_CLIENT_SECRET:${authFixture.googleClientSecret}`,
].join(" ");

export default defineConfig({
  testDir: "apps/web/__test__/e2e",
  outputDir: "test-results",
  reporter: "list",
  retries: 0,
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL,
    channel: "chrome",
    serviceWorkers: "allow",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-light",
      testMatch: /publication\.spec\.ts/u,
      use: { colorScheme: "light", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "desktop-dark",
      testMatch: /publication\.spec\.ts/u,
      use: { colorScheme: "dark", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "phone-light",
      testMatch: /publication\.spec\.ts/u,
      use: { colorScheme: "light", viewport: { width: 390, height: 844 } },
    },
    {
      name: "phone-dark-reduced-motion",
      testMatch: /publication\.spec\.ts/u,
      use: {
        colorScheme: "dark",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "owner-phone-light",
      dependencies: ["desktop-light", "desktop-dark", "phone-light", "phone-dark-reduced-motion"],
      testMatch: /owner\.spec\.ts/u,
      use: {
        colorScheme: "light",
        storageState: "apps/web/__test__/.auth/owner.json",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "owner-desktop-light",
      dependencies: ["owner-phone-light"],
      testMatch: /owner\.spec\.ts/u,
      use: {
        colorScheme: "light",
        storageState: "apps/web/__test__/.auth/owner.json",
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: `apps/web/node_modules/.bin/wrangler d1 migrations apply DB --local --persist-to apps/web/.wrangler/state --config apps/web/wrangler.json && node apps/web/__test__/scripts/seed-local.ts && ${workerCommand}`,
    reuseExistingServer: false,
    timeout: 180_000,
    url: baseURL,
  },
});
