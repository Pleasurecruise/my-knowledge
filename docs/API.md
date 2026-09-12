# REST API

Owner article resources use `/api/articles` and `/api/articles/{id}`. External clients send the shared `Authorization: Bearer <key>` credential. Without that header, browser authoring may use the allowed-email session; an invalid header never falls back. Unauthorized requests return `401` with a Bearer challenge.

| Method          | Contract                                                                       |
| --------------- | ------------------------------------------------------------------------------ |
| GET collection  | Paginated summaries; visibility, repeated tags, cursor, limit                  |
| POST collection | Browser draft or Chinese documents with optional English/Japanese; returns 201 |
| GET item        | Authorized article with all current editions                                   |
| PATCH item      | Content, visibility, or both in a draft with `expectedHash`                    |
| DELETE item     | `expectedHash`; returns 204                                                    |

Lists default to 20, maximum 100; tags use AND matching and include descendants. Stale mutations return `409`, missing articles `404`, invalid input `422`. Creation performs no hosted generation.

Only the owner browser session may access `/api/settings/api-key`: GET reports configuration/time, POST generates the first key, PUT rotates it after confirmation. Plaintext is returned once; rotation immediately invalidates the old key. Responses are `no-store`; persistence stores only the digest and creation metadata. This credential also authenticates MCP, never the key-management endpoint itself.
