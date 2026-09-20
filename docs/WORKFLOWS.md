# Content workflows

Local tools submit completed semantic Markdown. REST accepts Chinese with optional English/Japanese documents; MCP and browser authoring accept Chinese. Validate frontmatter, safety, tags, links and edition structure before persistence. Submissions create new identities without hosted generation.

The owner editor writes Chinese in every interface language. Create/edit share metadata and body. Unsaved drafts require confirmation before leaving; failed saves retain them. Save shares operations with external ingestion. Missing or stale translations display Chinese. Supplied translation failure does not withdraw already committed Chinese; retry against its current version.

Updates, visibility changes and deletion run through one per-article writer and require both content hash and updatedAt. Visibility is a draft property: Save commits it with content; Cancel discards it. New submissions remain public. Deletion hides the article before external cleanup, preserving privacy and retryability on failure.

Discovery and Graph read authorized metadata. Owner AI questions travel by POST and remain in component memory, never URLs or return links. Anonymous keyword searches retain shareable URLs. AI candidates require D1 authorization; excerpts use version-checked canonical content. Enrichment never rewrites stored Markdown. Cache failures propagate; canonical content and publication failures never become empty success. [Database](DATABASE.md) owns ordering; [API](API.md) owns credentials.
