# REST API

Articles use `/api/articles` and `/api/articles/{uuid}`. Clients send `Authorization: Bearer <key>`; browsers may use the allowed-email session. Invalid Bearer headers never fall back. Unauthorized requests return `401` with a Bearer challenge.

| Method          | Contract                                                                  |
| --------------- | ------------------------------------------------------------------------- |
| GET collection  | Summaries filtered by visibility, repeated tags, cursor, limit            |
| POST collection | Draft or Chinese documents with optional English/Japanese; 201            |
| GET item        | Article with current editions                                             |
| PATCH item      | Content, visibility, or both; requires expectedHash and expectedUpdatedAt |
| DELETE item     | Both version fields; 204                                                  |

Lists return `{ articles, cursor? }`; terminal pages omit cursor. Summaries contain `id`, `editions.zh.{title,summary}`, `tags`, `visibility`, `contentHash`, `createdAt`, `updatedAt`. Details add Markdown and current translations. Create, detail and content updates return `{ article }`; visibility returns the same envelope with a body-free summary.

Lists default to 20, maximum 100; tags intersect and include descendants. Missing reads return `404`; stale or unavailable mutations return `409` (draft updates distinguish missing articles with `404`); invalid input returns `422`.

Owner-session-only `/api/settings/api-key` supports status GET, first-generation POST and rotation PUT. Plaintext appears once; rotation invalidates the previous key. Responses are no-store; digests and timestamps persist.
