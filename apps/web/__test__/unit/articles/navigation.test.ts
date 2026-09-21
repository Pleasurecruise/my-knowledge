import { expect, it } from "vite-plus/test";
import { articleReturnHref } from "@/articles/navigation";

it.each([
  undefined,
  ["/explore"],
  "https://evil.example",
  "//evil.example/explore",
  "/explore/../api/auth",
  "/explore-other",
  "/explore\\evil",
])("rejects unsafe or unrelated return contexts: %s", (from) => {
  expect(articleReturnHref(from)).toBe("/");
});
it("preserves search context while dropping unrelated parameters", () => {
  expect(articleReturnHref("/explore?query=hello&view=graph&edit=1")).toBe("/explore?query=hello");
});
