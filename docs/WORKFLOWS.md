# Content workflows

Local tools submit completed semantic Markdown. REST accepts Chinese with optional English/Japanese documents; MCP and browser creation accept Chinese. Validate frontmatter, safety, tags and edition structure before persistence. Draft serialization validates Markdown once. Persistence returns committed metadata; read response bodies once after supplied translations finish. Submissions create identities without hosted generation.

Editing uses the entry language. Missing/stale translations redirect to the Chinese editor; existing translations edit independently, with shared tags read-only. Create/edit share metadata and Markdown source with a lazy, read-only Milkdown preview. Unsaved drafts require confirmation before leaving; failed saves retain them. Save stays locked through one document navigation that clears stale client routes. Missing/stale translations display Chinese; supplied translation failure preserves committed Chinese. Retry against its current version.

Mutations run through one per-article writer and require content hash and updatedAt. Visibility is a draft property: Save commits it with content; Cancel discards it. New submissions remain public. Deletion hides the article before external cleanup, preserving privacy and retryability on failure.

Discovery reads authorized metadata. Keyword searches retain shareable URLs. Enrichment never rewrites stored Markdown. Cache failures propagate; canonical content and publication failures never become empty success. [Database](DATABASE.md) owns ordering; [API](API.md) owns credentials.
