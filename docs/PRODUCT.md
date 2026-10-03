# Product

One personal blog turns writing into durable public articles. Home (`/`) shows chronology; Explore (`/explore`) searches by keyword or tag. Removed list and Graph routes return not found. Search preserves relevance; anonymous article return links retain exploration context. Owner authoring uses existing surfaces; there is no dashboard.

Every submission starts public after canonical Chinese persistence succeeds. The allowed-email owner may create, edit, publish, withdraw and delete. Keyword search serves every session; no search material is stored.

RSS, llms.txt, sitemap and social metadata always use anonymous visibility, including requests from signed-in owners. They list public articles outside the `daily` hierarchy. Missing and private articles return HTTP 404 to anonymous readers; their titles, tags, timestamps and bodies never appear in anonymous outputs. Public article pages publish `BlogPosting` structured data; Explore result pages are noindex. Robots advertises the public sitemap.

Chinese is canonical, with optional English and Japanese editions. Interface language follows the saved manual choice, then browser Accept-Language preferences, then Chinese. Regional variants map to Chinese, English or Japanese; missing translations use Chinese. Tags are case-insensitive hierarchical paths: at most five per article and one new leaf per submission. Prefer existing tags. The `daily` hierarchy is absent from default lists and search; explicit filters can include it without bypassing visibility.

Multiple owners, comments, revisions and hosted generation are outside scope.
