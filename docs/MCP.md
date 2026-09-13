# MCP contract

`POST /api/mcp` uses the same generated Bearer key as REST. Browser sessions cannot authenticate MCP. Prefer stateless `2026-07-28`; retain the `2025-11-25` initialization compatibility path. Reject supplied session IDs; GET and DELETE return `405`. Discovery exposes input schemas and annotations.

| Tool             | Core input and behavior                                     |
| ---------------- | ----------------------------------------------------------- |
| `createArticle`  | Complete Chinese `document`; creates public article         |
| `getArticle`     | `id`; returns Chinese and current supplied editions         |
| `listArticles`   | Optional visibility, tags, cursor, limit; Chinese summaries |
| `updateArticle`  | `id`, `expectedHash`, Chinese `document`                    |
| `deleteArticle`  | `id`, `expectedHash`; private-first cleanup                 |
| `searchArticles` | Query, optional tags/limit; authorized AI Search results    |
| `listTags`       | Optional parent; canonical paths and counts                 |
| `setVisibility`  | ID, visibility, expected hash                               |

Lists default to 20 and cap at 100; tag intersections include descendants. Search candidates require D1 authorization. Create and update documents cap at 500,000 characters. Stale updates report a version conflict. Updates stale translations; generation remains local.

No task, chat, cancellation, reindex, provider, or skill tools exist. Contracts cover authentication, discovery, schemas, stale writes, visibility, private isolation, and both protocol generations. Remote search and cleanup require live verification.
