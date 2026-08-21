# Product north star

Turn one valuable conversation into durable public knowledge that the owner can retrieve and share
without manual organization.

## Outcomes

- Capture: one MCP submission returns its future article ID and produces one valid public Chinese
  article; English and Japanese translations derive independently afterward.
- Retrieval: the owner can find knowledge through tags, links, graph, keywords, and grounded AI search.
- Publication: public articles read like a calm long-form knowledge library and produce complete,
  recognizable link previews.
- Simplicity: the personal application keeps the fewest stores, fields, routes, and operations needed.

## Hard measures

- Zero anonymous disclosure of private titles, bodies, metadata, vectors, or relationships.
- Submitted conversations exist only in expiring KV job-input entries until terminal processing;
  they never enter D1, R2, AI Search, job results, or application logs. AI-search request material is
  never stored. Cloudflare's AI Gateway log store may retain request and response payloads when
  `cf-aig-collect-log-payload: true` is enabled; this is a deliberate operational trade-off and is
  not a feature regression.
- Every AI answer citation resolves to an article authorized for the current session.
- Every generated article becomes public only after its canonical Chinese R2 object, Chinese-only AI
  Search item, and D1 row complete; an explicit owner action may withdraw it afterward.

A plan may improve one outcome without a numeric before/after result. Hard measures are release gates
and may never regress.
