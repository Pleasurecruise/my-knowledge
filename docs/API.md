# REST API

Status: Implemented locally and contract-tested

The article REST API represents the same single owner as the allowed-email browser session and MCP.
External clients send the current generated key as `Authorization: Bearer <key>`. Browser authoring
uses its Better Auth session when no Authorization header is present. An invalid Authorization header
never falls back to the browser session. Unauthorized REST requests return `401` with
`WWW-Authenticate: Bearer`.

## API key lifecycle

The signed-in owner calls `GET /api/settings/api-key` to inspect `{ configured, createdAt? }`, `POST`
to generate the first key, and `PUT` to regenerate it after explicit confirmation. Generation
returns `{ apiKey, createdAt }` once and regeneration immediately invalidates the previous
my-knowledge key. The project's Durable Object stores only the digest and creation metadata. Keys use
the `sk-` prefix. Responses use
`Cache-Control: no-store`. The API key endpoint accepts only the Better Auth owner session, never
the API key itself. [Database](DATABASE.md) owns the storage keys and record shape.

The same generated key authorizes `POST /api/mcp`; there is no separate MCP secret.

## Article resources

All article endpoints require owner authorization and may return private content.

| Method and path             | Input                                              | Result                  |
| :-------------------------- | :------------------------------------------------- | :---------------------- |
| `GET /api/articles`         | `visibility?`, repeated `tag`, `cursor?`, `limit?` | `{ articles, cursor? }` |
| `POST /api/articles`        | Browser draft or `{ documents: { zh, en?, ja? } }` | `201 { article }`       |
| `GET /api/articles/{id}`    | Article UUID path                                  | `{ article }`           |
| `PATCH /api/articles/{id}`  | Draft, documents, or visibility plus hash          | `{ article }`           |
| `DELETE /api/articles/{id}` | `{ expectedHash }`                                 | `204`                   |

List limits default to 20 and cannot exceed 100. Repeated tags use AND matching, and a parent tag
includes descendants. External create and update accept completed semantic Markdown; `zh` is required
and `en` or `ja` are optional. Browser authoring submits title, summary, body, and at most five tags.
No server-side model or translation job runs. Visibility, content update, and deletion use the current
64-character `contentHash` for optimistic concurrency.
A stale mutation returns `409`; an absent read returns `404`; invalid input returns `422`.
