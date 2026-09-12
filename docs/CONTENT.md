# Content contract

Chinese is canonical; English/Japanese editions render only when their source hash matches Chinese, otherwise readers receive Chinese. Slugs remain stable. Ordered YAML frontmatter contains only `title`, `summary`, and `tags`; translations preserve tags and wiki targets. Normalization removes one leading title heading, preserving other headings and code indentation.

Support CommonMark/GFM, code, math, callouts, `[[slug|label]]`, Mermaid, Vega/Vega-Lite JSON, and spatial JSON Canvas. Reject raw HTML, executable URLs, invalid structured blocks, duplicate fields, and unknown embed kinds. Code examples remain escaped. [Dialect tests](../packages/content/__test__/dialect.test.ts) specify accepted fields.

| Fence                | Required source                              |
| -------------------- | -------------------------------------------- |
| `embed:media`        | `type: audio                                 | video`, `src` |
| `embed:link`         | `url`                                        |
| `embed:github`       | `repo: owner/name`                           |
| `embed:stock`        | `code`                                       |
| `embed:architecture` | Flowchart or sanitized static SVG            |
| `embed:storyboard`   | Title and 2–6 steps, or sanitized static SVG |

Alignment is left/right/wide. Media accepts credential-free HTTP(S) or hosted relative assets; optional title, caption, and video poster remain escaped. Native controls require user playback; posterless video previews its opening frame. No filesystem reads or media uploads occur.

TOC and rendered headings share unique anchors, including empty/symbol headings. Shiki highlights supported languages; unknown languages remain plain code. Structured source stays verbatim.
