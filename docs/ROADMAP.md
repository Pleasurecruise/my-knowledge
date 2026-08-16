# Roadmap

Status: Proposed

## Release gates

Before production, accept the configured model provider's retention policy, choose the production
origin, and create its Google OAuth client. These are owner decisions; implementation must not guess
them.

## 1. Runnable foundation

The workspace manifests and exact dependency lock exist. Add package entrypoints, the Next.js and
OpenNext configuration, Cloudflare bindings, generated skill registry, and root checks.

Exit: the real generated Worker serves the four web surfaces and allowed-email authentication.

## 2. Article CRUD

Add D1/R2/KV, Better Auth, allowed-email authorization, bilingual article records, default-private
creation, MCP CRUD, public/private reads, and authenticated web deletion.

Exit: MCP manages a private article, the signed-in owner can delete it on the article page, and
anonymous routes reveal nothing private.

## 3. Content creation

Add the custom OpenCode Go provider, pinned Waza and project-owned rich-content skills, translation,
MCP `createArticle`, tags, wiki links, and the rule that submitted content is never persisted.

Exit: one MCP request returns one complete private bilingual article and only the result is stored.

## 4. Similarity and discovery

Add Workers AI embeddings, Vectorize duplicate threshold, owner-only AI answers, public keyword/tag
search, related articles, and the bounded graph view.

Exit: duplicates do not write, search respects visibility, and related knowledge is useful.

## 5. Publication surface

Complete the search hero, article list, article reader, graph, tag filtering, rich Markdown rendering,
bilingual navigation, public metadata, the Nordic token system, responsive design, accessibility, and
visual QA.

Exit: public reading is polished and private articles remain absent from every anonymous surface.

## Later

Additional languages, revision history, more diagram engines, and export formats only after a real
need appears.
