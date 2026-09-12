# Content contract

Chinese is canonical; English/Japanese editions require matching source hashes. Missing translations display Chinese. Frontmatter contains title, summary and tags. Slugs remain stable. Editors preserve semantic Markdown; content that cannot round-trip stays in source mode.

Support CommonMark/GFM, math, callouts, wiki links, Mermaid, Vega/Vega-Lite and JSON Canvas. Submissions reject raw HTML, executable URLs, malformed blocks and unknown/duplicate fields. Stored bodies remain readable and editable; invalid embeds show explicit block diagnostics without interpreting obsolete syntax. Headings and TOC share anchors.

Embeds include article, link, media, GitHub, stock, architecture and storyboard. All accept `align: left`, `right`, `wide` or `narrow`. Wide fills available width; left/right use a 32rem maximum at the named edge; narrow centers that maximum.

Article fences accept one `url:` field or 1–50 URL lines, plus alignment. Cards resolve authorized same-site titles/descriptions only. External URLs never fetch metadata; unsupported/inaccessible targets are non-clickable. Ordinary links stay unchanged. ID fields and overrides are rejected. Card URLs index authorized graph links and backlinks; queries/fragments do not change identity. Saving refreshes derived links.

Media requires audio/video type and src. Optional title, caption and video poster remain escaped. Sources use HTTP(S) without credentials or document-relative paths. Playback requires interaction. [Dialect tests](../packages/content/__test__/dialect.test.ts) specify fields.
