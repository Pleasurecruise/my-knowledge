# Design system

Status: Proposed foundation

## Intended feeling

The product is a quiet Nordic reading room: calm, precise, warm enough for long reading, and free of
visual performance. It should feel like a personal publication and library, not a SaaS dashboard or
an Obsidian clone.

Use generous negative space, strong typographic rhythm, hairline boundaries, nearly flat surfaces,
and one muted accent. Avoid gradients, glass effects, oversized shadows, excessive pills, ornamental
animation, dense sidebars, and decorative graph movement.

## Three token layers

Tokens have one source file and flow in one direction. Components never consume raw palette or
spacing values directly.

| Layer     | Responsibility                                      | Examples                                        |
| :-------- | :-------------------------------------------------- | :---------------------------------------------- |
| Reference | Raw color ramps, type scales, spacing, radius, time | `pine700`, `stone50`, `space4`, `durationFast`  |
| Semantic  | Meaning shared by all themes and components         | `bgPage`, `textMuted`, `borderSubtle`, `accent` |
| Component | Local contracts composed only from semantic tokens  | `articleMeasure`, `navHeight`, `calloutBorder`  |

The reference layer may change without component edits. Light and dark themes remap semantic tokens;
they do not fork component CSS. A component token is added only when a repeated component decision
cannot be expressed clearly with an existing semantic token.

## Color

The initial palette combines warm paper neutrals with a muted Nordic pine accent:

- light page: warm off-white rather than pure white;
- light surface: a small luminance step above the page;
- primary text: charcoal rather than black;
- dark page: blue-charcoal rather than pure black;
- dark surface: one restrained raised tone;
- accent: desaturated pine green for links, focus, selection, and active state;
- status colors: muted red, amber, and blue used only for meaning.

The working reference values are deliberately few:

| Token          | Light     | Dark      |
| :------------- | :-------- | :-------- |
| `page`         | `#F7F6F2` | `#171B1A` |
| `surface`      | `#FCFBF8` | `#1E2421` |
| `text`         | `#242827` | `#E8ECE7` |
| `textMuted`    | `#68706C` | `#A5AEA8` |
| `borderSubtle` | `#D8DCD6` | `#38413C` |
| `accent`       | `#456B5A` | `#84AA95` |

These text, muted-text, and accent pairs clear AA contrast against the proposed page backgrounds;
component states still require fixture-level verification. The accent never fills large reading
surfaces. Body copy, code, tables, graphs, focus rings, and every interactive state must meet WCAG
2.2 AA in both themes. Final approved values live only in reference tokens.

## Typography

- UI and metadata: Geist Sans with a system sans fallback.
- English long-form body: Source Serif 4 with a system serif fallback.
- Chinese long-form body: system Song/Ming stack first; evaluate Source Han Serif only after font
  size, license, subset, and Worker delivery costs are measured.
- Code: Geist Mono with a system monospace fallback.

Chinese and English use separate line-height, punctuation, and measure rules. Article width targets
approximately 68 Latin characters or 34 Chinese characters per line. Font files are self-hosted and
pinned when adopted; rendering must remain usable before fonts load and when they fail.

## Spatial and shape rules

- Use a four-pixel reference grid with a deliberately sparse semantic spacing scale.
- Reading pages use large vertical intervals; controls remain compact.
- Default radius is small. Fully rounded shapes are reserved for tags or true binary state.
- Shadows indicate overlays only. Cards use spacing and borders before elevation.
- Motion explains state change, lasts briefly, and is removed under reduced-motion preference.

## UI selection policy

Tailwind CSS implements token-backed styles. Radix primitives supply behavior for dialogs, menus,
tooltips, and other interaction-heavy controls. shadcn/ui is a source of selected component patterns,
not an installed visual identity: copied components are reduced to project tokens and conventions.
Lucide provides icons. No second component library is introduced for convenience.

The minimum primitive set is link, button, icon button, input, select, dialog, menu, tooltip,
separator, skeleton, and focus ring. Article-specific components are callout, code block, table, math,
Mermaid, Vega-Lite, citation, table of contents, related list, and locale switcher.

## Pages and information hierarchy

### Application shell

Public pages use one quiet header. The wordmark sits at the left; Articles and Graph are the only
primary destinations. Locale, theme, and Sign in sit at the right as compact actions. After
authentication, Sign in becomes a small account menu with Sign out; it does not open an owner area.
The header has a hairline bottom border, never floats over content, and does not grow into a dashboard
sidebar. On phones, Articles and Graph move into one menu while authentication remains directly
available.

### Public page blueprints

- Home is a centered search hero inspired by the directness of `my-memos`. A quiet wordmark and one
  short sentence sit above one large input. For anonymous visitors it accepts only keywords or tags
  and performs deterministic public search. After the allowed owner signs in, an AI mode appears next
  to Keyword and the same input can accept a knowledge question. Before a query, the page shows only a
  few recent articles and stable top-level tag paths below the fold. There is no marketing carousel,
  statistics strip, or dashboard chrome.
- An owner-only AI result appears directly below the hero as a readable answer grounded only in
  authorized articles. Inline citations and a small set of linked article cards show the title,
  one-sentence summary, matching excerpt, and tags. A refusal/empty result says that the knowledge base
  lacks enough evidence; it does not answer from general model knowledge. Anonymous visitors never
  receive the AI control or invoke its endpoint. Keyword and tag search returns deterministic article
  results using the same cards.
- Articles is the complete chronological library. A single toolbar provides keyword search,
  public/private scope when signed in, and a collapsible hierarchical tag filter. Results are quiet
  rows showing title, summary, updated date, visibility when signed in, and no more than three tag
  paths. There is no separate Tags or Search page.
- Article centers a single reading column. The title, summary, date, tag paths, locale switch, and
  private/public status when visible to the owner form a compact header. The signed-in owner also sees
  one Delete action in the overflow menu; there are no Edit or Publish actions. A table of contents
  occupies a quiet right rail only on wide screens; it becomes a disclosure above the body at smaller
  widths. Backlinks and semantically related articles appear after the body as two clearly labeled
  text lists.
- Graph gives most of the surface to a bounded canvas. A slim toolbar controls local/library scope,
  link type, tag grouping, and depth. Selecting a node opens a small detail panel with title, summary,
  tags, and an article link. An equivalent ordered relationship list follows the canvas for keyboard
  and screen-reader access.

### Density and responsive behavior

Reading content has a maximum measure of about `720px`; rich tables, charts, and diagrams may expand
into a wider breakout region without widening prose. The desktop shell uses a maximum page width near
`1200px`. At narrower widths, secondary rails disappear before type or touch targets shrink. At phone
widths, page gutters remain at least `16px`, controls are at least `44px` high, and search result cards
become a single column.

Article lists use dividers and whitespace instead of bordered cards. Empty states state what is absent
and offer one relevant action. Loading preserves page geometry with at most a few skeleton lines.
Errors appear beside the action or field that failed; toasts confirm completed background-free
mutations but never carry the only explanation.

Private articles are visible only in an allowed-email session and remain `noindex`. Public metadata,
caches, anonymous search, and anonymous graphs contain public articles only.

## Component character

Buttons are text-first, compact, and rectangular with a small radius. The filled accent treatment is
reserved for one primary action in a region; secondary actions use a subtle border or plain text.
Tags display their full hierarchical path and use a quiet tinted background only when interactive.
Inputs use visible labels, calm borders, and the same surface as the page unless grouping needs a
surface step.

Icons support labels instead of replacing unfamiliar actions. Dividers, indentation, type weight,
and spacing establish hierarchy before containers do. The graph is the only intentionally spatial
surface; the rest of the product remains typographic and linear.

## Content versus presentation

The Waza-backed writing step selects semantic forms and returns portable Markdown: prose, lists,
tables, code, math, Mermaid, Vega-Lite, and callouts. It never stores React, page HTML, CSS,
screenshots, or rendered SVG/canvas.

The Next.js frontend parses and sanitizes Markdown, maps approved AST nodes to React components,
renders code and structured blocks, and owns typography, themes, responsiveness, accessibility, and
visual regression. This is the docu.md-inspired boundary: durable rich content with replaceable
presentation.

## Quality gate

Every core page is checked with Chinese and English fixtures, phone and desktop widths, light and
dark themes, keyboard-only navigation, visible focus, reduced motion, and long code/table/diagram
overflow. AST coverage tests prove that content was not silently dropped; screenshot and automated
accessibility checks prove the rendered surface independently.

Kami informs restraint, composition, and visual QA. Its palette, fonts, templates, and assets are
not copied.
