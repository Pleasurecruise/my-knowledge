import { defineConfig } from "vite-plus";

const generated = [".next/**", ".open-next/**", "apps/web/.wrangler/**"];

export default defineConfig({
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
  run: {
    cache: true,
  },
});
