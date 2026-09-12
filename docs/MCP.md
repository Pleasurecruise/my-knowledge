# MCP contract

`POST /api/mcp` uses the same generated Bearer key as REST. Browser sessions do not authenticate MCP. Prefer stateless `2026-07-28`; retain the `2025-11-25` initialization compatibility path. Reject supplied session IDs; GET and DELETE return `405`. Tool discovery exposes authoritative input schemas and annotations.

| Tool             | Core input and behavior                                         |
| ---------------- | --------------------------------------------------------------- |
| `createArticle`  | Complete Chinese `document`; creates public article immediately |
| `getArticle`     | `id`; returns Chinese and current supplied editions             |
| `listArticles`   | Optional visibility, tags, cursor, limit; Chinese summaries     |
| `updateArticle`  | `id`, `expectedHash`, Chinese `document`                        |
| `deleteArticle`  | `id`, `expectedHash`; private-first cleanup                     |
| `searchArticles` | Query, optional tags/limit; authorized AI Search results        |
| `listTags`       | Optional parent; canonical paths and counts                     |
| `setVisibility`  | ID, visibility, expected hash                                   |

Lists default to 20 and cap at 100; tag intersections include descendants. Search candidates require D1 authorization. Content updates stale previous translations; generation and translation remain local.

There are no task, chat, cancellation, reindex, provider, or skill tools. Contracts cover authentication, discovery, schemas, stale writes, visibility, private isolation, and both protocol generations. Successful remote search and cleanup require separate live verification.
