# REST API

Articles: `/api/articles` and `/api/articles/{uuid}`; tags: `/api/tags`. Use `Authorization: Bearer <key>` or the allowed-email browser session. Invalid Bearer never falls back; unauthorized requests return `401` with WWW-Authenticate.

| Method          | Contract                                                                  |
| --------------- | ------------------------------------------------------------------------- |
| GET collection  | Summaries filtered by visibility, `tags`, cursor, limit, or search        |
| POST collection | Draft or Chinese documents with optional English/Japanese; 201            |
| GET item        | Article with current editions                                             |
| PATCH item      | Content, visibility, or both; requires expectedHash and expectedUpdatedAt |
| DELETE item     | Both version fields; 204                                                  |

Lists return `{ articles, nextCursor }`, with `nextCursor: null` on the last page. Summaries: `id`, `editions.zh.{title,summary}`, `tags`, `visibility`, `contentHash`, `createdAt`, `updatedAt`. Details include Markdown/current translations. Create, detail and updates return `{ article }`; visibility returns a body-free summary.

Translation draft PATCH requires locale (en/ja), title, summary, body and versions; no tags. Only current translations are editable; optional visibility is shared.

Lists default to 20, maximum 100; `tags` is comma-separated (at most five) and intersects, including descendants. `search` matches Chinese titles, summaries and tags like the MCP search and returns `{ articles, nextCursor: null }`. `GET /api/tags` takes an optional `parent` and returns `{ tags: [{ path, count }] }`. Missing reads: `404`; stale or unavailable mutations return `409` (content updates distinguish missing articles with `404`); invalid input returns `422`.

Owner-session-only `/api/settings/api-key`: status GET, creation POST, rotation PUT. Plaintext appears once; rotation invalidates previous keys. Responses are no-store; digests/timestamps persist.

Discovery: `/.well-known/api-catalog` serves an RFC 9727 linkset (`application/linkset+json`) anchoring `/api` to `/api/openapi.json` (OpenAPI 3.1 generated from the request schemas) and this document. The home page sends matching `Link` headers (`api-catalog`, `service-desc`, `service-doc`, `describedby` → `/llms.txt`). `/llms.txt` names `/rss.xml` in its introduction and lists the REST and MCP entry points in an `## API` section before the articles. The `/api/*` shape, Bearer-or-session rule and MCP tool naming are shared with my-memos and my-moment. Both are anonymous and static; robots allows the OpenAPI document under `/api/`.
