import { defineConfig } from "vite-plus";

const generated = [".next/**", ".open-next/**", "apps/web/.wrangler/**", ".agents/**"];

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
    jsPlugins: ["@shadcn/lint"],
    rules: {
      "shadcn/no-restyle": [
        "error",
        {
          allow: ["layout"],
          contracts: [
            { pattern: "^Button$", allow: ["layout", "text-muted-foreground"] },
            { pattern: "^Input$", allow: ["layout", "px-*"] },
            { pattern: "^CardTitle$", allow: ["layout", "typography"] },
            { pattern: "^CardContent$", allow: ["layout", "spacing"] },
            { pattern: "^PopoverDescription$", allow: ["layout", "typography"] },
          ],
        },
      ],
      "shadcn/no-raw-colors": "error",
    },
    overrides: [
      {
        files: ["packages/ui/src/components/**"],
        rules: { "shadcn/no-restyle": "off" },
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    server: { deps: { inline: ["react-tweet"] } },
  },
  run: {
    cache: true,
  },
});
