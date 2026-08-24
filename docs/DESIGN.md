# Frontend design

Status: Implemented

## Product character

This is one person's minimal knowledge blog. It should feel maintained, readable, and direct rather
than promotional or application-like. The publication masthead, chronological writing, typography,
hairline separators, and open space establish hierarchy. Blue is the only interaction accent.

The shadcn Base UI Luma source contributes interaction behavior and accessibility, not its registry
appearance. Project-owned tokens replace the registry font, palette, radii, shadows, and density.
Reading surfaces stay flat; shadows belong to overlays and the graph's spatial canvas.

## Composition rules

Marketing-template composition is prohibited. Do not introduce a centered hero, eyebrow slogan,
oversized product promise, feature-card grid, metric strip, testimonial, decorative glow, paired
conversion buttons, or repeated call to action. Do not present article metadata as dashboard widgets
or use Card as the default container.

Prefer this order of tools:

1. typography and a readable measure;
2. spacing and alignment;
3. separators and indentation;
4. a bounded surface only when the object or interaction genuinely needs one.

Secondary controls should consume only the space needed to identify and operate them. Search belongs
to Home. Articles and Graph do not repeat search, filter, scope, relation, depth, or grouping controls.

Cards are appropriate for a selected graph node or similarly bounded object. Article rows,
navigation, filters, prose, relationships, and missing-page content remain flat.

### Explicit avoid list

Treat these as review failures, not loose preferences:

- Do not add a hero, splash viewport, centered sales headline, product promise, slogan badge, or
  uppercase eyebrow such as “PRIVATE-FIRST” or “MULTILINGUAL”.
- Do not use gradients, blurred color orbs, spotlight backgrounds, glass panels, decorative grids,
  floating mockups, or illustration merely to fill empty space.
- Do not add “Get started”, “Learn more”, “Explore”, “Discover”, “Join”, or paired primary/secondary
  CTA patterns. Navigation labels name destinations; actions name the operation they perform.
- Do not turn Home into a feed, portal, or landing page. It contains search only; Articles owns all
  browsing and chronology.
- Do not turn Articles into a card gallery. It is a compact year/month/day writing index with one
  title per row and restrained metadata.
- Do not wrap filters, article relations, TOC, progress, empty states, or 404 copy in elevated cards.
  Use flat flow, a disclosure, or a hairline boundary.
- Do not add statistics, trending sections, featured posts, category tiles, author promotion,
  newsletter capture, social proof, or footer link columns.
- Do not use a dashboard sidebar, command center, dense toolbar, or mobile drawer for the three
  primary destinations. The visible three-tab masthead is the complete global navigation.
- Do not use oversized display type outside an article title. Standard page headings remain compact
  and left aligned.
- Do not use continuous ambient animation, parallax, scroll choreography, or decorative 3D. Motion
  explains a control state; spatial depth is reserved for Graph and explicit JSON Canvas content.
- Do not duplicate a component with ad hoc markup when an installed Base UI-backed shadcn component
  provides the required semantics.

## Foundation and ownership

Tailwind CSS v4 processes the shared CSS entrypoint through the official Next.js
`@tailwindcss/postcss` integration. `apps/web/postcss.config.js` contains that plugin only; v3-era
`postcss-import`, `autoprefixer`, and a JavaScript Tailwind config are absent. The current shadcn CLI
installs `base-luma` components backed by Base UI into `packages/ui`; application code consumes those
source components through `@my-knowledge/ui/components/*`. Lucide React provides named,
tree-shaken icons through the UI package icon entrypoint.

The CSS ownership is intentionally small:

```text
packages/ui/src/styles/index.css      Tailwind imports, source scan, and theme mapping
packages/ui/src/styles/tokens.css     Reference and semantic tokens for both themes
packages/ui/src/styles/base.css       Shared browser defaults and theme-transition behavior
packages/ui/src/styles/markdown.css   Portable article-content presentation
apps/web/app/styles/graph.css         Spatial graph background, SVG edges, and perspective behavior
```

Ordinary layouts use Tailwind utilities at the component. Do not create a stylesheet for one page or
component when utilities express the rule clearly.

## Tokens and themes

`tokens.css` is the sole color source. A small project-owned OKLCH reference layer defines the cold,
low-chroma Nordic palette. Semantic shadcn variables map those references to surface, text,
interaction, boundary, and status roles. Tailwind exposes semantic values to components;
Markdown and Graph consume the same semantic variables directly rather than maintaining compatibility
aliases or a second palette. CSS files do not use Tailwind `@apply`; components own Tailwind utility
composition, while the shared stylesheets contain ordinary CSS for their documented boundaries.

Light mode uses a cold frost page, paper surfaces, blue-charcoal ink, and a restrained fjord blue.
Dark mode uses a low-chroma night blue with subtly separated surfaces and a pale glacial blue for
interaction. Charts stay within cyan, steel, blue, and blue-violet rather than introducing an
unrelated green scale. The accent does not fill reading surfaces. Red is reserved for destructive
meaning.

The theme action follows the compact interaction used by `my-memos`: an icon button applies the saved
light/dark choice and uses a circular View Transition when supported. The implementation is owned
here and does not copy assets or source. System preference is the specified initial state when no
saved choice exists; reduced motion disables decorative transition.

## Type, spacing, and shape

- Interface, headings, and metadata use a deliberately narrow native grotesk stack led by Avenir
  Next and Helvetica Neue. The project does not inherit the registry's Geist default and does not
  download or copy an unreviewed font asset.
- Article prose uses the same narrow native grotesk family as `my-memos`, with locale-aware browser
  shaping and compact line height. Code retains the dedicated monospace stack.
- Code uses SF Mono, Menlo, Monaco, then Consolas.
- Standard page headings stay compact. Article section headings remain close to body scale and rely
  on spacing and medium weight rather than oversized type or decorative rules.
- Prose targets a `650px` maximum measure; the wider publication shell is shared by the masthead and
  page layouts.
- Phone gutters are at least `16px`, and interactive controls retain accessible target size.
- Ordinary controls and overlays use deliberately small corners. Full pills are reserved for
  intrinsically circular objects such as avatars, switches, progress, and status indicators. Content
  rows remain square and separated by hairlines.
- Ordinary cards are bordered and flat. A single restrained overlay shadow is shared by menus and
  dialogs; stronger depth is reserved for Graph and explicit JSON Canvas content.

## Shared shell

The header is a publication masthead within the same measure as the main pages. It uses a cropped
square from the supplied cat image, the `my knowledge` wordmark, and a compact localized subtitle.
Home, Articles, and Graph are the only three primary tabs. Home is explicit rather than being hidden
behind the wordmark; the wordmark still links home as a conventional shortcut. The active tab uses a
quiet secondary treatment. Interface language, owner API credential, theme, and account are compact
actions. The credential action sits immediately before theme and reveals a generated key only once. On small
screens the three tabs occupy their own row while the global actions remain directly available.

Authentication mirrors the compact avatar/popover rhythm of `my-memos`: anonymous users see a sign-in
popover, while the allowed owner sees identity and sign-out. There is no owner dashboard or marketing
navigation.

## Language

- The masthead language action cycles through the registered interface locales in registry order.
  Its visible code states the current locale, while its accessible label names the next locale. A
  secure same-site cookie stores the choice and the Server Action re-renders the current route.
- `apps/web/src/i18n/registry.ts` is the interface-locale registry; `messages/zh.ts`, `en.ts`, and
  `ja.ts` hold complete typed dictionaries. Each registry entry owns a BCP 47 code and native label.
  Chinese, English, and Japanese are currently registered; adding a locale adds one complete message
  module and one registry entry rather than changing an environment list.
- The masthead action changes interface labels only. Article content always uses the canonical Chinese
  document, and the Article header does not repeat a language control. Missing or unsupported
  interface cookies resolve to `zh-CN`.

Placeholders and operational error messages remain English so diagnostics are stable across locale
changes. Visible interface labels are translated.

## Page composition

Next.js route loading and error boundaries remain inside the publication shell. Loading uses a
restrained title-and-content skeleton with reduced-motion support; runtime errors use the Nordic
typography, boundary, localized recovery copy, Retry, and Home actions instead of the framework's
default error page.

### Home

Home is the narrow search surface. Its title block is the same component and pixel alignment as the
Articles title block. Anonymous search is keyword/tag only.
The owner uses the same keyword/tag form across authorized public and private rows. Home does not
repeat recent articles, topics, or any content from the Articles tab.

### Articles

Articles is the narrow chronological index and copies the `my-memos` Notes composition: compact serif
title with a short accent rule, one-line description, New action for the owner only while the Chinese
interface is selected, then the year/month/day list at the same spacing. It contains no search, tag,
or visibility controls. Each row contains day, title, and one restrained hierarchical tag.

### Article

Article is a document first and follows the `my-memos` Notes reading surface: one centered 650px axis,
the same title hierarchy and reading statistics, then prose. On phones, Previous page, All articles,
and owner-only Edit are a compact button group. On wide screens, the same navigation actions,
owner-only Edit, and reading progress form the fixed right rail. Previous page follows browser history
without a route fallback; All articles always links to `/articles`. Delete appears only while editing.
Prose H1/H2 styling follows the Notes renderer.

Named code fences are compiled server-side with the fine-grained Shiki pipeline defined in
[Content](CONTENT.md). GitHub light/dark token variables switch with the application theme; code
surfaces, borders, typography, and errors still consume the shared semantic CSS tokens. Wide tables
use the Markdown-owned scroll wrapper rather than page utilities.

Public Article routes generate 1200×630 social cards through Next.js `ImageResponse`. The composition
adapts the `my-memos` memo card to this project's cold Nordic palette: a paper surface on frost, thin
boundary, short fjord accent, compact site identity, editorial title, at most three tags, source, and
updated date. The renderer uses fixed standalone colors because browser CSS variables are unavailable
inside image generation; it does not introduce another design palette for application components.

On wide screens the fixed left TOC copies the Notes collapsed bars, delayed text reveal, heading
indentation, active marker, and smooth navigation. A long TOC remains vertically scrollable without
displaying a scrollbar. It is hidden on smaller screens. Neither rail participates in the document
grid. The owner editor copies the Notes save/cancel/delete rhythm and keeps Markdown canonical; the
owner edits the Chinese summary explicitly.
Wide-page title edges align with the Header content edges while the page body may use the larger
canvas. The new-article editor uses that Header-aligned wide shell, always presents Chinese editing
copy, and lets its metadata and editing surface share the available measure. Existing-article editing
keeps its compact metadata measure above the wide editor.

### Graph

Graph is the wide page, while its title uses the same typography and rule as Articles. It has no
top-right controls. The bounded canvas uses perspective, node elevation, and explicit edges. The
desktop side rail reserves a fixed row for the selected article, so the bounded relationship list
starts at a stable position regardless of summary height. The canvas and complete side rail have the
same desktop height; long selected-article content remains scrollable without displaying a scrollbar.
The related-article list follows the same hidden-scrollbar behavior. Graph removes wide-page bottom
padding, constrains both grid columns to the wide shell, and fits its canvas to the available viewport
instead of creating a permanent page scrollbar. The wide page's title and its canvas/card content share
one measure, so the canvas and side rail never render past the title above them; only the short empty
state keeps its own narrower reading measure.

### Not found

The 404 page is a quiet missing-document state: a small cropped mark, status line, concise explanation,
and understated links to Home and Articles. It does not use a centered product card, decorative glow,
or conversion-style CTA pair.

## Content boundary

Local tools produce semantic Markdown only: prose, lists, tables, code, math, Mermaid, Vega-Lite,
JSON Canvas, links, and callouts. They never persist React, page HTML, CSS, rendered SVG, or
screenshots. The Next.js frontend parses and sanitizes the AST, maps approved nodes to UI renderers,
and owns typography, theme, responsiveness, and accessibility.

Private articles remain `noindex` and are returned only to the allowed-email session. Public lists,
anonymous search, caches, and graphs contain public metadata only.

## Visual verification

Verify Home, Articles, Article, Graph, and 404 in the generated OpenNext Worker at desktop and phone
widths. Cover all registered interface languages, a Japanese article edition, light and dark themes,
reduced motion, keyboard navigation, visible focus, long code/table overflow, graph interaction, and a
clean console. Screenshots belong under `.agents/evidence`; they are execution evidence, not product
documentation.
