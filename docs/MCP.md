# MCP contract

`POST /api/mcp` uses the REST Bearer key. Browser sessions cannot authenticate MCP. Use stateless `2026-07-28`; reject older initialization protocols. Reject supplied session IDs; GET and DELETE return `405`. Discovery exposes schemas and annotations.

| Tool             | Core input and behavior                                          |
| ---------------- | ---------------------------------------------------------------- |
| `createArticle`  | Complete Chinese `document`; creates public article              |
| `getArticle`     | `id`; returns Chinese and current editions                       |
| `listArticles`   | Optional visibility, tags, cursor, limit; Chinese summaries      |
| `updateArticle`  | `id`, `expectedHash`, `expectedUpdatedAt`, Chinese `document`    |
| `deleteArticle`  | `id`, `expectedHash`, `expectedUpdatedAt`; private-first cleanup |
| `searchArticles` | Query, optional tags/limit; authorized AI Search results         |
| `listTags`       | Optional parent; canonical paths and counts                      |
| `setVisibility`  | ID, visibility, expected hash and updatedAt                      |

Lists default to 20, cap at 100; tag intersections include descendants. D1 authorizes search candidates. Create and update documents cap at 500,000 characters. Existing-article mutations require both version fields; stale state reports a conflict. Search deduplicates up to 50 chunks; tag recall remains bounded by this pool. Updates stale translations; generation remains local.

Contracts verify current protocol, obsolete-request rejection, authentication, schemas, conflicts and privacy. Remote retrieval and cleanup require live verification.
