# Content workflows

Local tools submit completed semantic Markdown. REST accepts Chinese with optional English/Japanese documents; MCP and browser authoring accept Chinese. Validate frontmatter, safety, tags, links and cross-edition structure before persistence. Each submission creates a new identity without hosted generation.

The owner editor writes Chinese in every interface language. Create/edit share title, summary, body and tags. Unsaved drafts require confirmation before leaving; failed saves retain them. Save uses the application operations shared with external ingestion. Missing or stale translations display Chinese. Supplied translation failure does not withdraw already committed Chinese; retry against its current hash.

Updates, visibility changes and deletion use optimistic concurrency. Existing visibility is a draft property: toggling does not persist or navigate; Save submits it with content and Cancel discards it. New submissions remain public. Deletion hides the article before external cleanup, preserving privacy and retryability on failure.

Discovery and Graph use authorized metadata. AI candidates are reauthorized and read through the shared version-checked content boundary before returning excerpts or citations. Enrichment never rewrites stored Markdown. Cache failures propagate; canonical content and publication failures never become empty success. [Database](DATABASE.md) owns ordering; [API](API.md) owns credentials.
