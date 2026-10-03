import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readArticleDocument } from "@my-knowledge/content";
import { Markdown } from "@my-knowledge/ui";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getArticleEdition, getArticleMetadata, readEmbed } from "@/articles";
import { articleReturnHref } from "@/articles/navigation";
import { ArticleLink } from "@/articles/components/article-link";
import { articleOpenGraphVersion } from "@/articles/components/article-open-graph-card";
import { ArticleHeader } from "@/articles/components/article-header";
import { ArticleNavigationActions } from "@/articles/components/article-navigation-actions";
import { ArticleAddress } from "@/articles/components/article-address";
import { ReferencePosition } from "@/articles/components/referencePosition";
import { ArticleEditorShell } from "@/articles/components/editor-shell";
import { StructuredBlock } from "@/articles/components/structured-block";
import { getPrincipal } from "@/auth/owner";
import { getInterfaceI18n } from "@/i18n/server";
import { interfaceLocales } from "@/i18n/registry";
import { siteAuthor, siteName } from "@/shell/site";

export async function generateMetadata({ params }: PageProps<"/articles/[id]">): Promise<Metadata> {
  const [{ id }, { env }] = await Promise.all([params, getCloudflareContext({ async: true })]);
  const article = await getArticleMetadata(env, id);
  if (!article) return { title: "Article not found", robots: { index: false, follow: false } };
  const edition = article.editions.zh;
  const canonical = new URL(`/articles/${article.id}`, env.BETTER_AUTH_URL);
  const socialImage = new URL(`/articles/${article.id}/opengraph-image`, env.BETTER_AUTH_URL);
  socialImage.searchParams.set("v", `${article.contentHash}-${articleOpenGraphVersion}`);
  return {
    title: edition.title,
    description: edition.summary,
    alternates: { canonical: canonical.href },
    keywords: article.tags,
    openGraph: {
      type: "article",
      title: edition.title,
      description: edition.summary,
      url: canonical,
      siteName,
      publishedTime: article.createdAt,
      modifiedTime: article.updatedAt,
      tags: article.tags,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: edition.title,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: edition.title,
      description: edition.summary,
      images: [{ url: socialImage, alt: edition.title }],
    },
    robots: { index: true, follow: true },
  };
}

export default async function ArticlePage({ params, searchParams }: PageProps<"/articles/[id]">) {
  const [{ id }, query, { env }, principal, i18n] = await Promise.all([
    params,
    searchParams,
    getCloudflareContext({ async: true }),
    getPrincipal(),
    getInterfaceI18n(),
  ]);
  const editing = principal === "owner" && query.edit === "1";
  const requestedLocale = editing && query.locale === "zh" ? "zh-CN" : i18n.code;
  const edition = await getArticleEdition(env, principal, id, requestedLocale);
  if (!edition) notFound();
  const { article, locale, text } = edition;
  const document = readArticleDocument(text.markdown);
  const returnHref = articleReturnHref(query.from);
  const context = returnHref === "/" ? "" : `&${new URLSearchParams({ from: returnHref })}`;
  if (editing) {
    if (locale === "zh" && requestedLocale !== "zh-CN")
      redirect(`/articles/${article.id}?edit=1&locale=zh${context}`);
    const editorI18n = interfaceLocales.find((entry) => entry.code === requestedLocale);
    if (!editorI18n) throw new Error("Editor interface locale is not registered");
    return (
      <div className="page-shell" data-article-id={article.id}>
        <ArticleAddress id={article.id} />
        <ArticleEditorShell
          article={{
            locale: locale === "en" || locale === "ja" ? locale : "zh",
            body: document.body,
            contentHash: article.contentHash,
            updatedAt: article.updatedAt,
            id: article.id,
            summary: text.summary,
            tags: article.tags,
            title: text.title,
            visibility: article.visibility,
          }}
          messages={editorI18n.messages.article}
          mode="edit"
        />
      </div>
    );
  }
  return (
    <div className="page-shell article-reading-page relative">
      <article
        className="mx-auto min-w-0 w-full max-w-(--article-measure)"
        id="article"
        data-article-id={article.id}
        lang={locale === "zh" ? "zh-CN" : locale}
      >
        <div className="article-title-row">
          <ArticleHeader title={text.title}>
            <ArticleNavigationActions
              key={article.id}
              articleHref={`/articles/${article.id}`}
              returnHref={returnHref}
              edit={
                principal === "owner"
                  ? { enabled: true, href: `/articles/${article.id}?edit=1${context}` }
                  : { enabled: false }
              }
              messages={i18n.messages.article}
            />
          </ArticleHeader>
        </div>
        <Markdown
          cache={article.visibility === "public" ? env.KNOWLEDGE_CACHE : null}
          embeds={readEmbed}
          link={ArticleLink}
          labels={{
            copyCode: i18n.messages.article.copyCode,
            codeCopied: i18n.messages.article.codeCopied,
            codeCopyFailed: i18n.messages.article.codeCopyFailed,
            canvas: i18n.messages.article.canvas,
            canvasRelationships: i18n.messages.article.canvasRelationships,
            canvasViewport: i18n.messages.article.canvasViewport,
            chart: i18n.messages.article.chart,
            diagram: i18n.messages.article.diagram,
            renderingDiagram: i18n.messages.article.renderingDiagram,
            spatialView: i18n.messages.article.spatialView,
          }}
          structuredBlock={StructuredBlock}
          markdown={document.body}
        />
        <ArticleAddress id={article.id} />
        {article.visibility === "public" ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                headline: article.editions.zh.title,
                description: article.editions.zh.summary,
                url: new URL(`/articles/${article.id}`, env.BETTER_AUTH_URL).href,
                inLanguage: "zh-CN",
                datePublished: article.createdAt,
                dateModified: article.updatedAt,
                keywords: article.tags,
                author: { "@type": "Person", name: siteAuthor },
              }).replaceAll("<", "\\u003c"),
            }}
          />
        ) : null}
        <ReferencePosition key={`${article.id}:${locale}`} />
      </article>
    </div>
  );
}
