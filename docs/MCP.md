# MCP contract

`POST /api/mcp` requires the REST Bearer key. Support `2026-07-28` and SDK legacy initialization, including `2025-11-25`. Legacy clients initialize, then send `MCP-Protocol-Version`; neither mode creates sessions. Reject session IDs; GET and DELETE return `405`.

| Tool           | Input and behavior                                  |
| -------------- | --------------------------------------------------- |
| createArticle  | Complete Chinese document; creates public article   |
| getArticle     | UUID; Chinese/current editions                      |
| listArticles   | Visibility, tags, cursor, limit; Chinese summaries  |
| updateArticle  | UUID, expectedHash, expectedUpdatedAt, document     |
| deleteArticle  | UUID and both version fields; private-first cleanup |
| searchArticles | Query and limit; authorized keyword results         |
| listTags       | Optional parent; paths/counts                       |
| setVisibility  | UUID, visibility and both version fields            |

Lists default to 20, maximum 100; tag intersections include descendants. Documents cap at 500,000 characters. Stale mutations report conflicts; updates invalidate translations.

Search matches Chinese titles/summaries/tags, newest first, excluding daily. It returns `{ articles }` with REST summaries; no scores/excerpts/tag filters. Search defaults to 10, maximum 50.

Text and structuredContent match. Article reads/writes return detail; visibility returns summaries. Lists use `{ articles, cursor? }`, tags `{ tags }`, deletion `{ deleted: true }`. Tool failures set isError.
