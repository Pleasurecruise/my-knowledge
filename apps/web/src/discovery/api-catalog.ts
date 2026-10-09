import { articleSchema, articleTextSchema } from "@my-knowledge/content";
import { z } from "zod";

import {
  articleCreateSchema,
  articleDeleteSchema,
  articleListQuerySchema,
  articlePatchSchema,
} from "@/api/articles";
import { siteDescription, siteName } from "@/shell/site";

const apiDocumentationUrl = "https://github.com/Pleasurecruise/my-knowledge/blob/main/docs/API.md";

const articleSummarySchema = articleSchema.extend({
  editions: z.object({ zh: articleTextSchema.omit({ markdown: true }) }),
});

export function createApiCatalog(origin: URL) {
  return {
    linkset: [
      {
        anchor: new URL("/api", origin).href,
        "service-desc": [
          {
            href: new URL("/api/openapi.json", origin).href,
            type: "application/vnd.oai.openapi+json",
          },
        ],
        "service-doc": [{ href: apiDocumentationUrl, type: "text/html" }],
      },
    ],
  };
}

export function createOpenApiDocument(origin: URL) {
  const query = z.toJSONSchema(articleListQuerySchema, { io: "input" });
  const articleId = {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
  };
  const unauthorized = { description: "Missing or invalid credential" };
  const article = {
    content: {
      "application/json": { schema: z.toJSONSchema(z.object({ article: articleSchema })) },
    },
  };

  return {
    openapi: "3.1.0",
    info: { title: `${siteName} API`, version: "1.0.0", description: siteDescription },
    externalDocs: { url: apiDocumentationUrl },
    servers: [{ url: origin.origin }],
    security: [{ bearerAuth: [] }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } },
    paths: {
      "/api/articles": {
        get: {
          operationId: "listArticles",
          summary: "List article summaries",
          description:
            "With search, matches titles, summaries, and tags and returns up to limit results with a null nextCursor.",
          parameters: [
            { name: "search", in: "query", schema: query.properties?.search },
            { name: "visibility", in: "query", schema: query.properties?.visibility },
            {
              name: "tags",
              in: "query",
              description: "Comma-separated tags; at most five, matched with descendants.",
              schema: query.properties?.tags,
            },
            { name: "cursor", in: "query", schema: query.properties?.cursor },
            { name: "limit", in: "query", schema: query.properties?.limit },
          ],
          responses: {
            "200": {
              description: "Article summaries",
              content: {
                "application/json": {
                  schema: z.toJSONSchema(
                    z.object({
                      articles: z.array(articleSummarySchema),
                      nextCursor: z.string().nullable(),
                    }),
                  ),
                },
              },
            },
            "401": unauthorized,
            "422": { description: "Invalid query" },
          },
        },
        post: {
          operationId: "createArticle",
          summary: "Create a public article",
          requestBody: {
            required: true,
            content: { "application/json": { schema: z.toJSONSchema(articleCreateSchema) } },
          },
          responses: {
            "201": { description: "Created article", ...article },
            "401": unauthorized,
            "422": { description: "Invalid article input" },
          },
        },
      },
      "/api/articles/{id}": {
        parameters: [articleId],
        get: {
          operationId: "getArticle",
          summary: "Get an article with current editions",
          responses: {
            "200": { description: "Article", ...article },
            "401": unauthorized,
            "404": { description: "Article not found" },
          },
        },
        patch: {
          operationId: "updateArticle",
          summary: "Update content, visibility, or both",
          requestBody: {
            required: true,
            content: { "application/json": { schema: z.toJSONSchema(articlePatchSchema) } },
          },
          responses: {
            "200": { description: "Updated article or visibility summary", ...article },
            "401": unauthorized,
            "404": { description: "Article not found" },
            "409": { description: "Article changed" },
            "422": { description: "Invalid article update" },
          },
        },
        delete: {
          operationId: "deleteArticle",
          summary: "Delete an article",
          requestBody: {
            required: true,
            content: { "application/json": { schema: z.toJSONSchema(articleDeleteSchema) } },
          },
          responses: {
            "204": { description: "Deleted" },
            "401": unauthorized,
            "409": { description: "Article changed or was not found" },
            "422": { description: "Invalid article deletion" },
          },
        },
      },
      "/api/tags": {
        get: {
          operationId: "listTags",
          summary: "List hierarchical tag paths with article counts",
          parameters: [{ name: "parent", in: "query", schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Tag counts",
              content: {
                "application/json": {
                  schema: z.toJSONSchema(
                    z.object({ tags: z.array(z.object({ path: z.string(), count: z.number() })) }),
                  ),
                },
              },
            },
            "401": unauthorized,
            "422": { description: "Invalid tag query" },
          },
        },
      },
    },
  };
}
