import { defineConfig } from "vite-plus";

const generated = [".next/**", ".open-next/**", "apps/web/.wrangler/**"];

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./apps/web/src", import.meta.url).pathname,
    },
  },
  fmt: {
    ignorePatterns: generated,
  },
  lint: {
    ignorePatterns: generated,
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
  run: {
    cache: true,
  },
});
