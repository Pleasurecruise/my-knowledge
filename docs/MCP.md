# MCP contract

`POST /api/mcp` requires the REST Bearer key; sessions cannot authenticate. Use stateless `2026-07-28`. Reject older protocols and session IDs; GET and DELETE return `405`.

| Tool           | Input and behavior                                  |
| -------------- | --------------------------------------------------- |
| createArticle  | Complete Chinese document; creates public article   |
| getArticle     | UUID; Chinese and current editions                  |
| listArticles   | Visibility, tags, cursor, limit; Chinese summaries  |
| updateArticle  | UUID, expectedHash, expectedUpdatedAt, document     |
| deleteArticle  | UUID and both version fields; private-first cleanup |
| searchArticles | Query and limit; authorized keyword results         |
| listTags       | Optional parent; paths and counts                   |
| setVisibility  | UUID, visibility and both version fields            |

Lists default to 20, maximum 100; tag intersections include descendants. Documents cap at 500,000 characters. Stale mutations report conflicts; updates invalidate translations.

Search matches Chinese titles, summaries and tags, newest first, excluding daily. It returns `{ articles }` with REST summaries; no score, excerpt or tag filter. Search defaults to 10, maximum 50.

Successful text and structuredContent contain identical values. Article reads/writes return detail directly; visibility returns a summary. Lists use `{ articles, cursor? }`, tags `{ tags }`, deletion `{ deleted: true }`. Tool failures set isError.
