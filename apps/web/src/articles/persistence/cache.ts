import { articleTextSchema, type ArticleText } from "@my-knowledge/content";
const cacheTtl = 86_400;

export type ArticleCache = {
  delete(key: string): Promise<void>;
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void>;
};

export function articleCacheKey(id: string, hash: string, locale: string): string {
  return `articles/${id}/${hash}/${locale}.json`;
}

export async function readArticleCache(
  cache: ArticleCache,
  id: string,
  hash: string,
  locale: string,
): Promise<ArticleText | undefined> {
  const value = await cache.get(articleCacheKey(id, hash, locale));
  if (value === null) return undefined;
  const parsed: unknown = JSON.parse(value);
  return articleTextSchema.parse(parsed);
}

export async function writeArticleCache(
  cache: ArticleCache,
  id: string,
  hash: string,
  locale: string,
  article: ArticleText,
): Promise<void> {
  await cache.put(articleCacheKey(id, hash, locale), JSON.stringify(article), {
    expirationTtl: cacheTtl,
  });
}

export async function deleteArticleCache(
  cache: ArticleCache,
  id: string,
  hash: string,
  locales: readonly string[],
): Promise<void> {
  await Promise.all(locales.map((locale) => cache.delete(articleCacheKey(id, hash, locale))));
}
