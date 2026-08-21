# Simple content flow

Status: Implemented locally; live provider and remote-store smoke await owner approval

## Queue creation

`createArticle` accepts conversation content in any language, generates the future article UUID,
stores the input in a 48-hour KV entry, publishes `{ type: "create", articleId }`, and returns that ID.
No D1 job row is created. `getArticleJob` derives `pending` from the input KV entry, `created` from the
article row, and `failed` from a sanitized TTL-bound KV receipt.

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
remains an explicit error. Processing retries three times; a fourth Chinese failure records one
sanitized KV receipt, deletes the input, and acknowledges the message.

## Derived translations

Each locale message contains `articleId`, `locale`, and the Chinese `sourceHash`. It reads the current
Chinese article, acknowledges obsolete messages whose hash no longer matches, and skips a translation
whose child row and R2 object are already current. Otherwise it translates one locale, validates it
against Chinese structure, writes the deterministic translation R2 object, and upserts the minimal
child row. English and Japanese retry and finish independently. Exhausted translation failures are
acknowledged without changing or withdrawing Chinese.

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

- `getArticleJob` returns `pending`, the created Chinese-first article, a sanitized failure, or not
  found after its temporary receipt expires.
- `getArticle` reads Chinese plus any current translation child records and R2 objects.
- `listArticles`, tags, links, and Graph use canonical Chinese D1 projections.
- `updateArticle` stores submitted Chinese immediately and queues derived translations.
- `searchArticles` and `chatArticles` use Chinese-only AI Search and re-authorize every article ID
  through D1.
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
