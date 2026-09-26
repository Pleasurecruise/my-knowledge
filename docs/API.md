# REST API

Articles: `/api/articles` and `/api/articles/{uuid}`. Use `Authorization: Bearer <key>` or the allowed-email browser session. Invalid Bearer never falls back; unauthorized requests return `401` with WWW-Authenticate.

| Method          | Contract                                                                  |
| --------------- | ------------------------------------------------------------------------- |
| GET collection  | Summaries filtered by visibility, repeated tags, cursor, limit            |
| POST collection | Draft or Chinese documents with optional English/Japanese; 201            |
| GET item        | Article with current editions                                             |
| PATCH item      | Content, visibility, or both; requires expectedHash and expectedUpdatedAt |
| DELETE item     | Both version fields; 204                                                  |

Lists return `{ articles, cursor? }`, omitting terminal cursors. Summaries: `id`, `editions.zh.{title,summary}`, `tags`, `visibility`, `contentHash`, `createdAt`, `updatedAt`. Details include Markdown/current translations. Create, detail and updates return `{ article }`; visibility returns a body-free summary.

Translation draft PATCH requires locale (en/ja), title, summary, body and versions; no tags. Only current translations are editable; optional visibility is shared.

Lists default to 20, maximum 100; tags intersect, including descendants. Missing reads: `404`; stale or unavailable mutations return `409` (draft updates distinguish missing articles with `404`); invalid input returns `422`.

Owner-session-only `/api/settings/api-key`: status GET, creation POST, rotation PUT. Plaintext appears once; rotation invalidates previous keys. Responses are no-store; digests/timestamps persist.
