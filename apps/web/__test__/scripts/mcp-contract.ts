import assert from "node:assert/strict";
import { z } from "zod";

import authFixture from "../fixtures/auth.json" with { type: "json" };

const endpointArgument = process.argv[2];
if (!endpointArgument) throw new Error("MCP contract endpoint is required");
const endpoint = endpointArgument;
const origin = new URL(endpoint).origin;
const apiKey = authFixture.mcpApiKey;

const editionSchema = z.object({ title: z.string(), markdown: z.string() });
const articleSchema = z.object({ id: z.string(), visibility: z.enum(["private", "public"]) });
const toolResultSchema = z.object({ isError: z.boolean().optional() });
const articleListResultSchema = toolResultSchema.extend({
  structuredContent: z.object({ articles: z.array(articleSchema) }),
});
const articleResultSchema = toolResultSchema.extend({
  structuredContent: z.object({ editions: z.record(z.string(), editionSchema) }),
});
const tagListResultSchema = toolResultSchema.extend({
  structuredContent: z.object({
    tags: z.array(z.object({ path: z.string(), count: z.number() })),
  }),
});
const visibilityResultSchema = toolResultSchema.extend({
  structuredContent: z.object({ visibility: z.enum(["private", "public"]) }),
});

const unauthorized = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "server/discover", params: {} }),
});
assert.equal(unauthorized.status, 401);
assert.equal(unauthorized.headers.get("www-authenticate"), "Bearer");

const get = await fetch(endpoint);
assert.equal(get.status, 405);
assert.equal(get.headers.get("allow"), "POST");

function modernRequest(
  id: number,
  method: string,
  params: { name?: string; arguments?: object } = {},
) {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "mcp-method": method,
      ...(typeof params.name === "string" ? { "mcp-name": params.name } : {}),
      "mcp-protocol-version": "2026-07-28",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: {
        ...params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientCapabilities": {},
        },
      },
    }),
  });
}

async function callTool<Output>(
  id: number,
  name: string,
  args: object,
  schema: z.ZodType<Output>,
): Promise<Output> {
  const response = await modernRequest(id, "tools/call", { name, arguments: args });
  const text = await response.text();
  assert.equal(response.status, 200, text);
  const body = z
    .object({ error: z.unknown().optional(), result: z.unknown() })
    .parse(JSON.parse(text));
  assert.equal(body.error, undefined);
  return schema.parse(body.result);
}

const discovery = await modernRequest(2, "server/discover");
assert.equal(discovery.status, 200);
const discoveryBody = z
  .object({ result: z.object({ supportedVersions: z.array(z.string()) }) })
  .parse(await discovery.json());
assert.deepEqual(discoveryBody.result.supportedVersions, ["2026-07-28"]);

const tools = await modernRequest(3, "tools/list");
assert.equal(tools.status, 200);
const toolsBody = z
  .object({
    result: z.object({
      tools: z.array(
        z.object({
          name: z.string(),
          annotations: z.object({ destructiveHint: z.boolean().optional() }),
          inputSchema: z.object({ required: z.array(z.string()).optional() }),
        }),
      ),
    }),
  })
  .parse(await tools.json());
assert.deepEqual(
  toolsBody.result.tools.map((tool) => tool.name),
  [
    "createArticle",
    "getArticle",
    "listArticles",
    "updateArticle",
    "deleteArticle",
    "searchArticles",
    "listTags",
    "setVisibility",
  ],
);
const deleteTool = toolsBody.result.tools.find((tool) => tool.name === "deleteArticle");
if (!deleteTool) throw new Error("deleteArticle was not discovered");
assert.equal(deleteTool.annotations.destructiveHint, true);
const createTool = toolsBody.result.tools.find((tool) => tool.name === "createArticle");
if (!createTool) throw new Error("createArticle was not discovered");
assert.deepEqual(createTool.inputSchema.required, ["content"]);
const updateTool = toolsBody.result.tools.find((tool) => tool.name === "updateArticle");
if (!updateTool) throw new Error("updateArticle was not discovered");
assert.deepEqual(updateTool.inputSchema.required, ["id", "expectedHash", "document"]);

const fixtureId = "11111111-1111-4111-8111-111111111111";
const fixtureHash = "99565281b97b58653d28bb2a051ccc2ff0be870cd2f1f2116f9a45b5c6c071b5";
const listed = await callTool(4, "listArticles", { limit: 10 }, articleListResultSchema);
assert.deepEqual(
  listed.structuredContent.articles.map((article) => article.id),
  [
    "33333333-3333-4333-8333-333333333333",
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
  ],
);
const firstArticle = listed.structuredContent.articles.at(0);
if (!firstArticle) throw new Error("The article fixture list is empty");
assert.equal(firstArticle.visibility, "private");
const fetched = await callTool(5, "getArticle", { id: fixtureId }, articleResultSchema);
const chineseEdition = fetched.structuredContent.editions.zh;
if (!chineseEdition) throw new Error("The Chinese fixture edition is missing");
const japaneseEdition = fetched.structuredContent.editions.ja;
if (!japaneseEdition) throw new Error("The Japanese fixture edition is missing");
assert.equal(japaneseEdition.title, "拡張可能な知識の境界");
const tags = await callTool(6, "listTags", {}, tagListResultSchema);
assert.deepEqual(
  tags.structuredContent.tags.map((tag) => tag.path),
  [
    "engineering",
    "engineering/architecture",
    "knowledge",
    "knowledge/i18n",
    "testing",
    "testing/privacy",
  ],
);
assert.deepEqual(
  Object.fromEntries(tags.structuredContent.tags.map((tag) => [tag.path, tag.count])),
  {
    engineering: 2,
    "engineering/architecture": 2,
    knowledge: 1,
    "knowledge/i18n": 1,
    testing: 1,
    "testing/privacy": 1,
  },
);

const staleUpdate = await callTool(
  7,
  "updateArticle",
  {
    id: fixtureId,
    expectedHash: "0".repeat(64),
    document: chineseEdition.markdown,
  },
  toolResultSchema,
);
assert.equal(staleUpdate.isError, true);
const stale = await callTool(
  8,
  "setVisibility",
  {
    id: fixtureId,
    expectedHash: "0".repeat(64),
    visibility: "private",
  },
  toolResultSchema,
);
assert.equal(stale.isError, true);
const hidden = await callTool(
  9,
  "setVisibility",
  {
    id: fixtureId,
    expectedHash: fixtureHash,
    visibility: "private",
  },
  visibilityResultSchema,
);
assert.equal(hidden.structuredContent.visibility, "private");
const privatePage = await fetch(`${origin}/articles/extensible-knowledge-boundaries`).then(
  (response) => response.text(),
);
assert.match(privatePage, /<meta name="robots" content="noindex/u);
assert.doesNotMatch(privatePage, /可扩展的知识边界/u);
const restored = await callTool(
  10,
  "setVisibility",
  {
    id: fixtureId,
    expectedHash: fixtureHash,
    visibility: "public",
  },
  visibilityResultSchema,
);
assert.equal(restored.structuredContent.visibility, "public");

const legacy = await fetch(endpoint, {
  method: "POST",
  headers: {
    accept: "application/json, text/event-stream",
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 11,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "my-knowledge-contract", version: "1.0.0" },
    },
  }),
});
assert.equal(legacy.status, 200);
assert.match(await legacy.text(), /"protocolVersion":"2025-11-25"/u);

console.log(
  "MCP contract passed: auth, discovery, reads, tags, stale writes, visibility, and legacy initialize",
);
