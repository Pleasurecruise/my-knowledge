# Simple content flow

Status: Implemented locally; live provider and remote-store smoke await owner approval

## Queue creation

`createArticle` accepts conversation content in any language, generates the future article UUID,
stores the input in a 48-hour KV entry, publishes `{ type: "create", articleId }`, and returns that ID.
No task row or task-status API is created. MCP clients use the returned ID with `getArticle`.
If Queue publication fails, the mutation fails and the unpublished KV input expires through the same
48-hour TTL; submission does not run a second cleanup path.

The Queue consumer selects the bounded project skills and asks the configured model for one finished
Simplified Chinese article. After Markdown validation it:

1. conditionally writes the stable Chinese R2 object;
2. uploads only Chinese to AI Search;
3. inserts the public Chinese D1 row;
4. publishes independent `translate` messages for `en` and `ja`;
5. deletes the submitted input;
6. acknowledges the create message.

Queue delivery is at least once. The future article ID is also the D1 primary key, R2 directory, and
AI Search key prefix. Redelivery reuses an existing completed article; an R2 object without its D1 row
remains an explicit error. Valid job failures escape the consumer without acknowledgement; Cloudflare
Queues applies its default three retries and records each failed invocation. Submitted content remains
only in its 48-hour KV entry until a successful creation deletes it or the TTL expires. No application
failure log contains submitted content or article text.

## Derived translations

Each locale message contains `articleId`, `locale`, and the Chinese `sourceHash`. It reads the current
Chinese article, acknowledges obsolete messages whose hash no longer matches, and skips a translation
whose child row and R2 object are already current. Otherwise it translates one locale, validates it
against Chinese structure, writes the deterministic translation R2 object, and upserts the minimal
child row. English and Japanese run, retry, and fail independently. An exhausted translation message
is discarded without changing or withdrawing Chinese.

Translations are presentation derivatives: they never enter AI Search, never authorize an article,
and never block a created result. A missing or stale translation falls back to Chinese.

## Browser authoring

The allowed-email owner creates or edits canonical Chinese Markdown from the existing Article
surface. Browser create regenerates the Chinese summary, commits the public Chinese article through
R2, AI Search, and D1, then requests both translations. Browser update performs the same Chinese-only
conditional write and queues fresh translations. Translation enqueue errors are returned to the
caller; they are not swallowed or converted into success.

Publish, withdraw, and delete remain explicit operations. Delete first withdraws the row, cleans the
stable Chinese and translation R2 objects, the Chinese AI Search item, and caches, then deletes the D1
row and cascaded translation metadata.

## MCP mutations, reads, and search

- `getArticle` reads Chinese plus any current translation child records and R2 objects.
- `listArticles`, tags, links, and Graph use canonical Chinese D1 projections.
- `updateArticle` stores submitted Chinese immediately and queues derived translations.
- `searchArticles` uses Chinese-only AI Search and re-authorizes every article ID through D1.
- `setVisibility` explicitly publishes or withdraws an existing article.

## Failure behavior

- Invalid input or model Markdown stores no article.
- R2, AI Search, or D1 failure before Chinese commit rolls back artifacts owned by that attempt and
  retries creation.
- Translation execution never rolls back canonical Chinese; translation enqueue errors remain
  observable to the caller or retrying create message.
- A stale translation message or row is ignored by source-hash comparison.
- Unauthorized reads behave as not found; anonymous access still depends on D1 visibility.
- Cache failure is observable and falls back to authorized canonical R2.
