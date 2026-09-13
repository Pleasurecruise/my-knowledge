import { getCloudflareContext } from "@opennextjs/cloudflare";
import { expect, it, vi } from "vite-plus/test";
import { updateArticleInput, updateArticleOperation } from "@/mcp/operations";

const update = vi.hoisted(() => vi.fn());
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: {} }) }));
vi.mock("@/articles/service", () => ({ updateArticleFromDocuments: update }));

it("bounds update documents like creation documents", () => {
  expect(
    updateArticleInput.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      expectedHash: "a".repeat(64),
      document: "x".repeat(500_001),
    }).success,
  ).toBe(false);
});

it.each([
  ["stale", "Article changed while saving"],
  ["notFound", "Article not found"],
])("reports %s distinctly", async (status, message) => {
  update.mockResolvedValue({ status });
  const { env } = await getCloudflareContext({ async: true });
  expect(
    await updateArticleOperation(env, {
      id: "11111111-1111-4111-8111-111111111111",
      expectedHash: "a".repeat(64),
      document: "Markdown",
    }),
  ).toEqual({ isError: true, content: [{ type: "text", text: message }] });
});
