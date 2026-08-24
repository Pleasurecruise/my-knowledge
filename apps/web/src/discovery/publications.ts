import type { ArticleSummary } from "@my-knowledge/content";

const siteTitle = "my knowledge";
const siteDescription = "A private-first multilingual knowledge library.";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function createRssFeed(articles: readonly ArticleSummary[], origin: URL): string {
  const feedUrl = new URL("/rss.xml", origin).href;
  const homeUrl = new URL("/", origin).href;
  const visibleArticles = articles.filter((article) => article.visibility === "public");
  const lastBuildDate = visibleArticles.at(0)?.updatedAt;
  const items = visibleArticles
    .map((article) => {
      const articleUrl = new URL(`/articles/${article.slug}`, origin).href;
      const edition = article.editions.zh;
      return [
        "    <item>",
        `      <title>${escapeXml(edition.title)}</title>`,
        `      <description>${escapeXml(edition.summary)}</description>`,
        `      <link>${escapeXml(articleUrl)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(articleUrl)}</guid>`,
        `      <pubDate>${new Date(article.createdAt).toUTCString()}</pubDate>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(siteTitle)}</title>`,
    `    <description>${escapeXml(siteDescription)}</description>`,
    `    <link>${escapeXml(homeUrl)}</link>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>`,
    "    <language>zh-CN</language>",
    ...(lastBuildDate
      ? [`    <lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>`]
      : []),
    ...(items ? [items] : []),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export function createLlmsText(articles: readonly ArticleSummary[], origin: URL): string {
  const links = articles
    .filter((article) => article.visibility === "public")
    .map((article) => {
      const articleUrl = new URL(`/articles/${article.slug}`, origin).href;
      const title = article.editions.zh.title
        .replaceAll(/\s+/gu, " ")
        .trim()
        .replaceAll("\\", "\\\\")
        .replaceAll("[", "\\[")
        .replaceAll("]", "\\]");
      const summary = article.editions.zh.summary.replaceAll(/\s+/gu, " ").trim();
      return `- [${title}](${articleUrl}): ${summary}`;
    });

  return [
    `# ${siteTitle}`,
    "",
    `> ${siteDescription}`,
    "",
    "This index contains only public articles. Article pages are canonical; Chinese is the primary edition.",
    "",
    "## Articles",
    "",
    ...(links.length > 0 ? links : ["No public articles are available."]),
    "",
  ].join("\n");
}
