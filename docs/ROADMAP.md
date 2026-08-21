# Roadmap

Status: Local implementation complete; browser and live-provider release evidence remains

## Release gates

Before production, accept the configured model provider's retention policy, choose the production
origin, and create its Google OAuth client. These are owner decisions; implementation must not guess
them.

## 1. Runnable foundation — complete

The workspace manifests, exact dependency lock, package entrypoints, Next.js/OpenNext configuration,
Cloudflare bindings, generated skill registry, and root checks exist.

Exit: the real generated Worker serves the four web surfaces and allowed-email authentication.

## 2. Article CRUD — complete locally, live AI Search cleanup smoke pending

D1/R2/KV, Better Auth, allowed-email authorization, Chinese article records, default-public
creation, MCP CRUD, public/private reads, and authenticated browser create/edit/visibility/delete are
implemented.

Exit: MCP manages a public article; the signed-in owner can create, edit, publish, withdraw, and
delete from the Notes-derived Article surface; anonymous routes reveal nothing private. Successful
AI summary generation and cross-store cleanup remain live account gates.

## 3. Content creation — complete, live provider smoke pending

The custom provider adapter, pinned Waza and project-owned rich-content skills, Chinese-first writing,
independent derived translations, asynchronous MCP `createArticle`, tags, wiki links, and bounded KV
input lifetime are implemented.

Exit: one MCP submission returns the future article ID; `getArticle` reads it after creation,
temporary input is deleted, and translations may settle independently afterward.

## 4. Search and discovery — AI Search

Authorized keyword/tag search and the bounded graph view are implemented; Workers AI embeddings and
Vectorize were replaced by Cloudflare AI Search article retrieval. Creation no longer performs a
similarity or content-hash lookup.

Exit: search respects visibility, and the graph links related knowledge.

## 5. Publication surface — complete locally

The three-tab personal publication masthead, Home search, chronological article index, document
reader, wide graph, Home-only search, Notes-derived Markdown editor and rendering, interface language
control, project-owned Nordic tokens, and responsive design are
implemented. Final browser screenshots and owner-flow evidence remain before archive.

Exit: public reading is polished and private articles remain absent from every anonymous surface.

## Later

Additional interface display languages, revision history, more diagram engines, and export formats
only after a real need appears. Chinese remains canonical; English and Japanese are derived R2
children with minimal D1 metadata.
