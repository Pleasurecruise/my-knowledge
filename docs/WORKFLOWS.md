# Content workflows

Local tools produce completed semantic Markdown. REST accepts Chinese with optional English/Japanese documents; MCP and the browser editor accept Chinese. Validate frontmatter, safety, tags, wiki targets, and cross-edition structure before persistence. Each submission creates a new identity without a duplicate lookup or hosted model call.

The owner editor requires title, one-sentence summary, body, and tags. Save uses the same application operations as external ingestion. Follow [Database](DATABASE.md#writes) for Chinese-first persistence and cleanup. Supplied translation failure does not withdraw successfully committed Chinese; retry against the current hash. Missing or stale translations display Chinese.

Updates, visibility changes, and deletion require optimistic concurrency. Publish and withdraw remain explicit operations. Deletion hides the article before external cleanup so a failure remains private and retryable. API-key rotation is a separate owner-session operation described in [API](API.md).

Keyword/tag discovery, links, and Graph use authorized metadata. AI Search candidates are re-authorized before returning titles, excerpts, or citations. Provider-card enrichment never rewrites stored Markdown. Cache failures must be observable and may fall back to authorized R2; missing canonical content, credentials, and publication failures never become empty success.
