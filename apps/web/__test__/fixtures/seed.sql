DELETE FROM articleTranslations;
DELETE FROM articles;

INSERT OR REPLACE INTO articles (
  id, slug, title, summary, contentHash, tagsJson, linksJson, visibility, createdAt, updatedAt
) VALUES
  ('11111111-1111-4111-8111-111111111111', 'extensible-knowledge-boundaries', '可扩展的知识边界', '用稳定的内容模型承载不断增加的语言与表现形式。', '60a93252b4aad827daa74851a0b1ff889226fef40b87c55e74cde3493f8c9370', '["engineering/architecture","knowledge/i18n"]', '["related-article"]', 'public', '2026-08-15T08:00:00.000Z', '2026-08-16T08:00:00.000Z'),
  ('22222222-2222-4222-8222-222222222222', 'related-article', '相关实践', '通过共享标签和明确链接保持知识关系可解释。', 'ff05da72f85e25930d01f0e144564d58c100a01e5fc86f467075b89f591f8c72', '["engineering/architecture"]', '[]', 'public', '2026-08-14T08:00:00.000Z', '2026-08-15T08:00:00.000Z'),
  ('33333333-3333-4333-8333-333333333333', 'private-deletion-fixture', '私密删除夹具', '只允许所有者读取并通过浏览器删除的测试文章。', '24127f5139323ac615200058d1cc566fcc55d7fbd37563f93aa153992d3e3725', '["testing/privacy"]', '[]', 'private', '2026-08-16T09:00:00.000Z', '2026-08-16T09:00:00.000Z');

INSERT OR REPLACE INTO articleTranslations (articleId, locale, title, summary, sourceHash) VALUES
  ('11111111-1111-4111-8111-111111111111', 'en', 'Extensible Knowledge Boundaries', 'Use a stable content model for growing languages and presentation forms.', '60a93252b4aad827daa74851a0b1ff889226fef40b87c55e74cde3493f8c9370'),
  ('11111111-1111-4111-8111-111111111111', 'ja', '拡張可能な知識の境界', '安定したコンテンツモデルで、増え続ける言語と表現形式を支える。', '60a93252b4aad827daa74851a0b1ff889226fef40b87c55e74cde3493f8c9370'),
  ('22222222-2222-4222-8222-222222222222', 'en', 'Related Practice', 'Keep knowledge relationships explainable with tags and explicit links.', 'ff05da72f85e25930d01f0e144564d58c100a01e5fc86f467075b89f591f8c72'),
  ('22222222-2222-4222-8222-222222222222', 'ja', '関連する実践', '共有タグと明示的なリンクで知識の関係を説明可能に保つ。', 'ff05da72f85e25930d01f0e144564d58c100a01e5fc86f467075b89f591f8c72'),
  ('33333333-3333-4333-8333-333333333333', 'en', 'Private deletion fixture', 'A test article that only the owner can read and delete in the browser.', '24127f5139323ac615200058d1cc566fcc55d7fbd37563f93aa153992d3e3725'),
  ('33333333-3333-4333-8333-333333333333', 'ja', '非公開削除フィクスチャ', '所有者だけがブラウザで閲覧し削除できるテスト記事。', '24127f5139323ac615200058d1cc566fcc55d7fbd37563f93aa153992d3e3725');
