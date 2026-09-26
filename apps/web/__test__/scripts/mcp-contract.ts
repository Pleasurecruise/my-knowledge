import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { z } from "zod";

const endpointArgument = process.argv[2];
if (!endpointArgument) throw new Error("MCP contract endpoint is required");
const endpoint = endpointArgument;
const origin = new URL(endpoint).origin;
const apiKey = process.env.MY_KNOWLEDGE_API_KEY;
if (!apiKey) throw new Error("MY_KNOWLEDGE_API_KEY is required");

const editionSummarySchema = z.strictObject({ title: z.string(), summary: z.string() });
const editionSchema = editionSummarySchema.extend({ markdown: z.string() });
const articleSchema = z.strictObject({
  id: z.uuid(),
  editions: z.strictObject({ zh: editionSummarySchema }),
  tags: z.array(z.string()),
  visibility: z.enum(["private", "public"]),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const detailSchema = articleSchema.extend({
  editions: z.strictObject({
    zh: editionSchema,
    en: editionSchema.optional(),
    ja: editionSchema.optional(),
  }),
});
const pageSchema = z.strictObject({
  articles: z.array(articleSchema),
  cursor: z.string().optional(),
});
const toolResultSchema = z.object({ isError: z.boolean().optional() });
const articleListResultSchema = toolResultSchema.extend({ structuredContent: pageSchema });
const articleResultSchema = toolResultSchema.extend({ structuredContent: detailSchema });
const tagListResultSchema = toolResultSchema.extend({
  structuredContent: z.object({ tags: z.array(z.object({ path: z.string(), count: z.number() })) }),
});
const visibilityResultSchema = toolResultSchema.extend({ structuredContent: articleSchema });

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
    .object({ error: z.never().optional(), result: z.unknown() })
    .parse(JSON.parse(text));
  assert.equal(body.error, undefined);
  const envelope = z
    .object({
      content: z.tuple([z.object({ type: z.literal("text"), text: z.string() })]),
      structuredContent: z.unknown().optional(),
    })
    .parse(body.result);
  if (envelope.structuredContent !== undefined) {
    assert.deepEqual(JSON.parse(envelope.content[0].text), envelope.structuredContent);
  }
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
          description: z.string(),
          name: z.string(),
          annotations: z.object({ destructiveHint: z.boolean().optional() }),
          inputSchema: z.object({
            required: z.array(z.string()).optional(),
            properties: z.record(z.string(), z.unknown()),
          }),
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
const searchTool = toolsBody.result.tools.find((tool) => tool.name === "searchArticles");
if (!searchTool) throw new Error("searchArticles was not discovered");
assert.deepEqual(Object.keys(searchTool.inputSchema.properties).sort(), ["limit", "query"]);
assert.match(searchTool.description, /keyword/u);
const deleteTool = toolsBody.result.tools.find((tool) => tool.name === "deleteArticle");
if (!deleteTool) throw new Error("deleteArticle was not discovered");
assert.equal(deleteTool.annotations.destructiveHint, true);
const createTool = toolsBody.result.tools.find((tool) => tool.name === "createArticle");
if (!createTool) throw new Error("createArticle was not discovered");
assert.deepEqual(createTool.inputSchema.required, ["document"]);
assert.match(createTool.description, /complete semantic Chinese Markdown document/u);
const updateTool = toolsBody.result.tools.find((tool) => tool.name === "updateArticle");
if (!updateTool) throw new Error("updateArticle was not discovered");
assert.deepEqual(updateTool.inputSchema.required, [
  "id",
  "expectedHash",
  "expectedUpdatedAt",
  "document",
]);

const fixtureId = "11111111-1111-4111-8111-111111111111";
const restEndpoint = `${origin}/api/articles`;
const unauthorizedRest = await fetch(restEndpoint);
assert.equal(unauthorizedRest.status, 401);
assert.equal(unauthorizedRest.headers.get("www-authenticate"), "Bearer");
const restList = await fetch(`${restEndpoint}?tag=engineering&limit=10`, {
  headers: { authorization: `Bearer ${apiKey}` },
});
assert.equal(restList.status, 200, await restList.clone().text());
const restListBody = pageSchema.parse(await restList.json());
assert.deepEqual(
  restListBody.articles.map((article) => article.id),
  [fixtureId, "22222222-2222-4222-8222-222222222222"],
);
const restArticle = await fetch(`${restEndpoint}/${fixtureId}`, {
  headers: { authorization: `Bearer ${apiKey}` },
});
assert.equal(restArticle.status, 200, await restArticle.clone().text());
z.object({ article: articleResultSchema.shape.structuredContent }).parse(await restArticle.json());
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
// Other browser journeys create daily articles; isolate the frozen fixture tags.
const fixtureTags = tags.structuredContent.tags.filter(
  (tag) => tag.path !== "daily" && !tag.path.startsWith("daily/"),
);
assert.deepEqual(
  fixtureTags.map((tag) => tag.path),
  [
    "engineering",
    "engineering/architecture",
    "knowledge",
    "knowledge/i18n",
    "testing",
    "testing/privacy",
  ],
);
assert.deepEqual(Object.fromEntries(fixtureTags.map((tag) => [tag.path, tag.count])), {
  engineering: 2,
  "engineering/architecture": 2,
  knowledge: 1,
  "knowledge/i18n": 1,
  testing: 1,
  "testing/privacy": 1,
});

const searched = await callTool(
  20,
  "searchArticles",
  { query: "testing/privacy" },
  toolResultSchema.extend({
    structuredContent: z.strictObject({ articles: z.array(articleSchema) }),
  }),
);
assert.deepEqual(
  searched.structuredContent.articles.map(({ id }) => id),
  ["33333333-3333-4333-8333-333333333333"],
);
assert.equal(searched.structuredContent.articles[0]?.visibility, "private");
const emptySearch = await callTool(
  21,
  "searchArticles",
  { query: "no-such-contract-article" },
  articleListResultSchema,
);
assert.deepEqual(emptySearch.structuredContent.articles, []);

// Exercise actual REST writes and MCP reads against the same article and version fields.
const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };
const createdResponse = await fetch(restEndpoint, {
  method: "POST",
  headers,
  body: JSON.stringify({
    documents: {
      zh: "---\ntitle: Contract article\nsummary: REST and MCP parity\ntags: [daily/contract]\n---\nHello :suzume5_01:.\n",
      en: "---\ntitle: Contract translation\nsummary: Current English edition\ntags: [daily/contract]\n---\nHello.\n",
    },
  }),
});
assert.equal(createdResponse.status, 201, await createdResponse.clone().text());
const created = z.strictObject({ article: detailSchema }).parse(await createdResponse.json());
assert.equal(created.article.visibility, "public");
const reread = await callTool(22, "getArticle", { id: created.article.id }, articleResultSchema);
assert.deepEqual(reread.structuredContent, created.article);
const changed = await callTool(
  23,
  "updateArticle",
  {
    id: created.article.id,
    expectedHash: created.article.contentHash,
    expectedUpdatedAt: created.article.updatedAt,
    document: created.article.editions.zh.markdown.replace(
      "Hello :suzume5_01:.",
      "Updated :suzume5_01:.",
    ),
  },
  articleResultSchema,
);
assert.deepEqual(Object.keys(changed.structuredContent.editions), ["zh"]);
const detailResponse = await fetch(`${restEndpoint}/${created.article.id}`, { headers });
assert.equal(detailResponse.status, 200);
const detail = z.strictObject({ article: detailSchema }).parse(await detailResponse.json());
assert.deepEqual(detail.article, changed.structuredContent);
const visibilityResponse = await fetch(`${restEndpoint}/${created.article.id}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    expectedHash: detail.article.contentHash,
    expectedUpdatedAt: detail.article.updatedAt,
    visibility: "private",
  }),
});
assert.equal(visibilityResponse.status, 200);
const visibility = z
  .strictObject({ article: articleSchema })
  .parse(await visibilityResponse.json());
assert.equal(visibility.article.visibility, "private");
assert.notEqual(visibility.article.updatedAt, detail.article.updatedAt);
const pageResponse = await fetch(`${restEndpoint}?tag=daily/contract&limit=1`, { headers });
assert.equal(pageResponse.status, 200);
const page = pageSchema.parse(await pageResponse.json());
assert.deepEqual(page.articles, [visibility.article]);
const staleResponse = await fetch(`${restEndpoint}/${created.article.id}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    expectedHash: detail.article.contentHash,
    expectedUpdatedAt: detail.article.updatedAt,
    visibility: "public",
  }),
});
assert.equal(staleResponse.status, 409);
const deletedResponse = await fetch(`${restEndpoint}/${created.article.id}`, {
  method: "DELETE",
  headers,
  body: JSON.stringify({
    expectedHash: visibility.article.contentHash,
    expectedUpdatedAt: visibility.article.updatedAt,
  }),
});
assert.equal(deletedResponse.status, 204);
assert.equal((await fetch(`${restEndpoint}/${created.article.id}`, { headers })).status, 404);
const output = process.env.KNOWLEDGE_CONTRACT_OUTPUT;
if (output)
  await writeFile(
    output,
    `${JSON.stringify({ list: page, created, detail, visibility, search: searched.structuredContent }, null, 2)}\n`,
  );

const staleUpdate = await callTool(
  7,
  "updateArticle",
  {
    id: fixtureId,
    expectedUpdatedAt: fetched.structuredContent.updatedAt,
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
    expectedUpdatedAt: fetched.structuredContent.updatedAt,
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
    expectedUpdatedAt: fetched.structuredContent.updatedAt,
    expectedHash: fetched.structuredContent.contentHash,
    visibility: "private",
  },
  visibilityResultSchema,
);
assert.equal(hidden.structuredContent.visibility, "private");
const privatePage = await fetch(`${origin}/articles/11111111-1111-4111-8111-111111111111`).then(
  (response) => response.text(),
);
assert.match(privatePage, /<meta name="robots" content="noindex/u);
assert.doesNotMatch(privatePage, /可扩展的知识边界/u);
const restored = await callTool(
  10,
  "setVisibility",
  {
    id: fixtureId,
    expectedUpdatedAt: hidden.structuredContent.updatedAt,
    expectedHash: fetched.structuredContent.contentHash,
    visibility: "public",
  },
  visibilityResultSchema,
);
assert.equal(restored.structuredContent.visibility, "public");

async function legacyRequest(method: string, params: object, id?: number) {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(method === "initialize" ? {} : { "mcp-protocol-version": "2025-11-25" }),
    },
    body: JSON.stringify({ jsonrpc: "2.0", ...(id === undefined ? {} : { id }), method, params }),
  });
}

async function legacyResult(response: Response): Promise<unknown> {
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("mcp-session-id"), null);
  const text = await response.text();
  const data = response.headers.get("content-type")?.startsWith("text/event-stream")
    ? text
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => JSON.parse(line.slice(6)))
    : [JSON.parse(text)];
  assert.equal(data.length, 1);
  return z.object({ result: z.unknown(), error: z.never().optional() }).parse(data[0]).result;
}

const initialized = await legacyResult(
  await legacyRequest(
    "initialize",
    {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "my-knowledge-contract", version: "1.0.0" },
    },
    11,
  ),
);
assert.equal(
  z.object({ protocolVersion: z.string() }).parse(initialized).protocolVersion,
  "2025-11-25",
);
assert.equal((await legacyRequest("notifications/initialized", {})).status, 202);
const legacyTools = z
  .object({ tools: z.array(z.object({ name: z.string() })) })
  .parse(await legacyResult(await legacyRequest("tools/list", {}, 12)));
assert.deepEqual(
  legacyTools.tools.map((tool) => tool.name),
  toolsBody.result.tools.map((tool) => tool.name),
);
const legacyArticle = articleResultSchema.parse(
  await legacyResult(
    await legacyRequest("tools/call", { name: "getArticle", arguments: { id: fixtureId } }, 13),
  ),
);
assert.equal(legacyArticle.structuredContent.id, fixtureId);
assert.equal(legacyArticle.isError, undefined);

const session = await fetch(endpoint, {
  method: "POST",
  headers: { authorization: `Bearer ${apiKey}`, "mcp-session-id": "unsupported-session" },
});
assert.equal(session.status, 400);

console.log(
  "API contract passed: shared auth, REST/MCP parity, keyword search, stale writes, visibility, modern discovery and 2025-11-25 initialization/list/call without sessions",
);
