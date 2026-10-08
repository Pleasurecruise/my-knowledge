import { defineConfig } from "@playwright/test";

import base from "./playwright.config";

const port = 8788;
const baseURL = `http://127.0.0.1:${port}`;
const webServer = base.webServer as {
  command: string;
  url: string;
  reuseExistingServer: boolean;
  timeout: number;
};

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL },
  webServer: {
    ...webServer,
    command: webServer.command.replaceAll(":8787", `:${port}`),
    url: baseURL,
  },
});
