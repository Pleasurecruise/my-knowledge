import { parseArticleDocument } from "./document";
import { normalizeLocale } from "./locale";
import type { ArticleDocumentSet, ParsedArticleDocument } from "./schema";

export async function hashArticle(documents: Readonly<Record<string, string>>): Promise<string> {
  const encoder = new TextEncoder();
  const localeNames = new Set<string>();
  const parts = Object.entries(documents).map(([locale, markdown]): [string, string] => {
    const normalized = normalizeLocale(locale);
    if (localeNames.has(normalized)) throw new Error(`Duplicate article locale: ${normalized}`);
    localeNames.add(normalized);
    return [normalized, markdown];
  });
  parts.sort(([left], [right]) => left.localeCompare(right));
  const bytes = encoder.encode(
    parts.map(([locale, markdown]) => `${locale}\0${markdown}\0`).join(""),
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function parseArticleDocuments(
  documents: Readonly<Record<string, string>>,
): Promise<ArticleDocumentSet> {
  const localeNames = new Set<string>();
  const entries = Object.entries(documents).map(
    ([locale, markdown]): [string, ParsedArticleDocument] => {
      const normalized = normalizeLocale(locale);
      if (localeNames.has(normalized)) throw new Error(`Duplicate article locale: ${normalized}`);
      localeNames.add(normalized);
      return [normalized, parseArticleDocument(markdown)];
    },
  );
  const editions = Object.fromEntries(entries);
  const base = editions.zh;
  if (!base) throw new Error("Article documents require a zh edition");
  for (const [locale, edition] of Object.entries(editions)) {
    if (
      base.tags.map((tag) => tag.toLocaleLowerCase("en-US")).join("\0") !==
      edition.tags.map((tag) => tag.toLocaleLowerCase("en-US")).join("\0")
    ) {
      throw new Error(`Edition tags must match zh: ${locale}`);
    }
    if (base.links.join("\0") !== edition.links.join("\0")) {
      throw new Error(`Edition wiki-link targets must match zh: ${locale}`);
    }
  }
  return {
    editions: { ...editions, zh: base },
    tags: base.tags,
    links: base.links,
    contentHash: await hashArticle(
      Object.fromEntries(
        Object.entries(editions).map(([locale, edition]) => [locale, edition.markdown]),
      ),
    ),
  };
}
