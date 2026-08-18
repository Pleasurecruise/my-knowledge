import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/server/validators/cf-worker";

import { isMcpAuthorized } from "@/mcp/auth";
import {
  createArticleInput,
  createArticleOperation,
  deleteArticleInput,
  deleteArticleOperation,
  getArticleInput,
  getArticleJobInput,
  getArticleJobOperation,
  getArticleOperation,
  listArticlesInput,
  listArticlesOperation,
  listTagsInput,
  listTagsOperation,
  searchArticlesInput,
  searchArticlesOperation,
  setVisibilityInput,
  setVisibilityOperation,
  updateArticleInput,
  updateArticleOperation,
} from "@/mcp/operations";

function serverFor(env: CloudflareEnv) {
  const server = new McpServer(
    { name: "my-knowledge", version: "0.1.0" },
    { jsonSchemaValidator: new CfWorkerJsonSchemaValidator() },
  );

  server.registerTool(
    "createArticle",
    {
      description:
        "Accept conversation content for asynchronous creation of one private Chinese article.",
      inputSchema: createArticleInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    (input) => createArticleOperation(env, input),
  );

  server.registerTool(
    "getArticleJob",
    {
      description: "Read the current state or terminal result of an article creation job.",
      inputSchema: getArticleJobInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => getArticleJobOperation(env, input),
  );

  server.registerTool(
    "getArticle",
    {
      description: "Read one owner-authorized article.",
      inputSchema: getArticleInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => getArticleOperation(env, input),
  );

  server.registerTool(
    "listArticles",
    {
      description: "List compact owner-authorized article summaries with opaque pagination.",
      inputSchema: listArticlesInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => listArticlesOperation(env, input),
  );

  server.registerTool(
    "updateArticle",
    {
      description: "Replace the canonical Chinese Markdown using optimistic concurrency.",
      inputSchema: updateArticleInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => updateArticleOperation(env, input),
  );

  server.registerTool(
    "deleteArticle",
    {
      description: "Delete an article after making it private and cleaning every derived store.",
      inputSchema: deleteArticleInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => deleteArticleOperation(env, input),
  );

  server.registerTool(
    "searchArticles",
    {
      description: "Semantically search owner-authorized articles.",
      inputSchema: searchArticlesInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    (input) => searchArticlesOperation(env, input),
  );

  server.registerTool(
    "listTags",
    {
      description: "List the owner's hierarchical tag paths and article counts.",
      inputSchema: listTagsInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => listTagsOperation(env, input),
  );

  server.registerTool(
    "setVisibility",
    {
      description: "Explicitly change an article between private and public.",
      inputSchema: setVisibilityInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) => setVisibilityOperation(env, input),
  );

  return server;
}

export async function handleMcp(env: CloudflareEnv, request: Request): Promise<Response> {
  if (!(await isMcpAuthorized(env, request))) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  const handler = createMcpHandler(() => serverFor(env), { legacy: "stateless" });
  return handler.fetch(request);
}
