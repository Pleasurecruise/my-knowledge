DELETE FROM articles;

INSERT OR REPLACE INTO articles (
  id, slug, contentHash, metaJson, tagsJson, linksJson, visibility, createdAt, updatedAt
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'extensible-knowledge-boundaries',
  '99565281b97b58653d28bb2a051ccc2ff0be870cd2f1f2116f9a45b5c6c071b5',
  '{"zh":{"title":"可扩展的知识边界","summary":"用稳定的内容模型承载不断增加的语言与表现形式。"},"en":{"title":"Extensible Knowledge Boundaries","summary":"Use a stable content model for growing languages and presentation forms."},"ja":{"title":"拡張可能な知識の境界","summary":"安定したコンテンツモデルで、増え続ける言語と表現形式を支える。"}}',
  '["engineering/architecture","knowledge/i18n"]',
  '["related-article"]',
  'public',
  '2026-08-15T08:00:00.000Z',
  '2026-08-16T08:00:00.000Z'
);

INSERT OR REPLACE INTO articles (
  id, slug, contentHash, metaJson, tagsJson, linksJson, visibility, createdAt, updatedAt
) VALUES (
  '22222222-2222-4222-8222-222222222222',
  'related-article',
  '266ed4837c32e892b9e1ca59e4339bf9206e8a31be0544d81437a25fc30b7400',
  '{"zh":{"title":"相关实践","summary":"通过共享标签和明确链接保持知识关系可解释。"},"en":{"title":"Related Practice","summary":"Keep knowledge relationships explainable with tags and explicit links."},"ja":{"title":"関連する実践","summary":"共有タグと明示的なリンクで知識の関係を説明可能に保つ。"}}',
  '["engineering/architecture"]',
  '[]',
  'public',
  '2026-08-14T08:00:00.000Z',
  '2026-08-15T08:00:00.000Z'
);

INSERT OR REPLACE INTO articles (
  id, slug, contentHash, metaJson, tagsJson, linksJson, visibility, createdAt, updatedAt
) VALUES (
  '33333333-3333-4333-8333-333333333333',
  'private-deletion-fixture',
  '9859fec5e397ef21b07ff25a813a3149e46fda460fca71d5e5871e74823152c3',
  '{"zh":{"title":"私密删除夹具","summary":"只允许所有者读取并通过浏览器删除的测试文章。"},"en":{"title":"Private deletion fixture","summary":"A test article that only the owner can read and delete in the browser."},"ja":{"title":"非公開削除フィクスチャ","summary":"所有者だけがブラウザで閲覧し削除できるテスト記事。"}}',
  '["testing/privacy"]',
  '[]',
  'private',
  '2026-08-16T09:00:00.000Z',
  '2026-08-16T09:00:00.000Z'
);
