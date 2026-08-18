import { getCloudflareContext } from "@opennextjs/cloudflare";
import { extractHeadings, parseArticleDocument } from "@my-knowledge/content";
import { Markdown } from "@my-knowledge/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getArticleBySlug, getArticleRelations } from "@/articles";
import { ArticleHeader } from "@/articles/components/article-header";
import { ArticleNavigationActions } from "@/articles/components/article-navigation-actions";
import { ArticleRelationList } from "@/articles/components/article-relations";
import { ArticleSide } from "@/articles/components/article-side";
import { ArticleToc } from "@/articles/components/article-toc";
import { ArticleEditorShell } from "@/articles/components/editor-shell";
import { StructuredBlock } from "@/articles/components/structured-block";
import { getPrincipal } from "@/auth/owner";
import { getInterfaceI18n } from "@/i18n/server";

export async function generateMetadata({
  params,
}: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const [{ slug }, { env }] = await Promise.all([params, getCloudflareContext({ async: true })]);
  const article = await getArticleBySlug(env, "anonymous", slug);
  if (!article) return { title: "Article not found", robots: { index: false, follow: false } };
  const edition = article.editions.zh;
  const canonical = new URL(`/articles/${article.slug}`, env.BETTER_AUTH_URL);
  const socialImage = new URL(`/articles/${article.slug}/opengraph-image`, env.BETTER_AUTH_URL);
  socialImage.searchParams.set("v", article.contentHash);
  return {
    title: edition.title,
    description: edition.summary,
    alternates: { canonical },
    keywords: article.tags,
    openGraph: {
      type: "article",
      title: edition.title,
      description: edition.summary,
      url: canonical,
      siteName: "my knowledge",
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

export default async function ArticlePage({ params, searchParams }: PageProps<"/articles/[slug]">) {
  const [{ slug }, query, { env }, principal, i18n] = await Promise.all([
    params,
    searchParams,
    getCloudflareContext({ async: true }),
    getPrincipal(),
    getInterfaceI18n(),
  ]);
  const article = await getArticleBySlug(env, principal, slug);
  if (!article) notFound();
  const text = article.editions.zh;
  if (principal === "owner" && query.edit === "1") {
    const document = parseArticleDocument(text.markdown);
    return (
      <div className="mx-auto max-w-280 px-4 pt-5 pb-20 sm:px-8 sm:pt-7 sm:pb-24">
        <ArticleEditorShell
          article={{
            body: document.body,
            contentHash: article.contentHash,
            id: article.id,
            slug: article.slug,
            summary: text.summary,
            tags: article.tags,
            title: text.title,
            visibility: article.visibility,
          }}
          messages={i18n.messages.article}
          mode="edit"
        />
      </div>
    );
  }
  const relations = await getArticleRelations(env, principal, article);
  const headings = extractHeadings(text.markdown);
  return (
    <div className="relative mx-auto max-w-280 px-4 pt-5 pb-20 sm:px-8 sm:pt-7 sm:pb-24">
      <article
        className="mx-auto mt-6 min-w-0 w-full max-w-162.5 sm:mt-8"
        id="article"
        lang="zh-CN"
      >
        <ArticleHeader
          actions={
            <ArticleNavigationActions
              edit={
                principal === "owner"
                  ? { enabled: true, href: `/articles/${article.slug}?edit=1` }
                  : { enabled: false }
              }
              messages={i18n.messages.article}
              surface="mobile"
            />
          }
          text={text.markdown}
          title={text.title}
        />
        {headings.length > 0 ? (
          <ArticleToc headings={headings} key="zh" label={i18n.messages.article.tableOfContents} />
        ) : null}
        <Markdown
          labels={{
            canvas: i18n.messages.article.canvas,
            canvasRelationships: i18n.messages.article.canvasRelationships,
            canvasViewport: i18n.messages.article.canvasViewport,
            chart: i18n.messages.article.chart,
            diagram: i18n.messages.article.diagram,
            renderingDiagram: i18n.messages.article.renderingDiagram,
            spatialView: i18n.messages.article.spatialView,
          }}
          structuredBlock={StructuredBlock}
          markdown={text.markdown}
        />
        <div className="mt-16 grid gap-8 border-t pt-8 sm:grid-cols-2">
          <ArticleRelationList
            articles={relations.backlinks}
            empty={i18n.messages.article.noBacklinks}
            heading={i18n.messages.article.backlinks}
          />
          <ArticleRelationList
            articles={
              relations.semantic.status === "available"
                ? relations.semantic.articles.map(({ article: related }) => related)
                : []
            }
            empty={
              relations.semantic.status === "available"
                ? i18n.messages.article.noRelated
                : i18n.messages.article.relationsUnavailable
            }
            heading={i18n.messages.article.related}
          />
        </div>
      </article>
      <ArticleSide
        edit={
          principal === "owner"
            ? { enabled: true, href: `/articles/${article.slug}?edit=1` }
            : { enabled: false }
        }
        messages={i18n.messages.article}
      />
    </div>
  );
}
