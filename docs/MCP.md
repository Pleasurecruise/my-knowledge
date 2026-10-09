# MCP contract

`POST /api/mcp` requires the REST Bearer key. Support `2026-07-28` and SDK legacy initialization, including `2025-11-25`. Legacy clients initialize, then send `MCP-Protocol-Version`; neither mode creates sessions. Reject session IDs; GET and DELETE return `405`.

| Tool            | Input and behavior                                  |
| --------------- | --------------------------------------------------- |
| create_article  | Complete Chinese document; creates public article   |
| get_article     | UUID; Chinese/current editions                      |
| list_articles   | Visibility, tags, cursor, limit; Chinese summaries  |
| update_article  | UUID, expectedHash, expectedUpdatedAt, document     |
| delete_article  | UUID and both version fields; private-first cleanup |
| search_articles | Query and limit; authorized keyword results         |
| list_tags       | Optional parent; paths/counts                       |
| set_visibility  | UUID, visibility and both version fields            |

Lists default to 20, maximum 100; tag intersections include descendants. Documents cap at 500,000 characters. Stale mutations report conflicts; updates invalidate translations.

Search matches Chinese titles/summaries/tags, newest first, excluding daily. It returns `{ type: "article-search-results", query, articles }` with REST summaries; no scores/excerpts/tag filters. Search defaults to 10, maximum 50.

Tool names use snake_case `verb_noun` and arguments reuse the REST field names, matching my-memos and my-moment. Text and structuredContent match. Single articles are wrapped as `{ article }` (detail for reads and writes, summary for visibility). Lists use `{ articles, nextCursor }`, tags `{ tags }`, deletion `{ id, deleted: true }`. Tool failures set isError.
