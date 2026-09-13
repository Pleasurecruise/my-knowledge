# Content contract

Chinese is canonical; English/Japanese editions require matching source hashes and otherwise display Chinese. Frontmatter contains title, summary and tags. Slugs stay stable. Non-round-trippable content stays in source mode.

Support CommonMark/GFM, math, callouts, wiki links, Mermaid, Vega/Vega-Lite and JSON Canvas. Reject normalized-empty bodies, raw HTML, executable URLs, malformed blocks and unknown/duplicate fields. Invalid stored embeds show diagnostics. AST-bound headings preserve TOC/footnote targets.

Embeds include article, link, media, GitHub, stock, architecture, storyboard, quote and diff. Alignment accepts left/right (32rem maximum), narrow (centered 32rem), or wide (available width).

Article fences accept one URL field or 1–50 URLs. Cards resolve authorized same-site metadata; inaccessible/external targets are non-clickable without external fetches. Overrides/IDs are rejected. Ordinary links stay unchanged. Saving refreshes authorized graph links/backlinks; query/fragment differences preserve identity.

Media requires audio/video type and src; optional title, caption and video poster stay escaped. Sources accept credential-free HTTP(S) or document-relative paths. Playback requires interaction.

Quote/diff metadata precedes `---` and a plain-text body. Quote requires author; title and credential-free HTTP(S) source URL are optional. Diff requires title and a complete unified text patch with matching hunk counts; binary/mode-only patches are unsupported. Both preserve text without executing HTML or Git. [Contract fixtures](../packages/content/__test__/fixtures/document-embeds.json) match my-workspace.
