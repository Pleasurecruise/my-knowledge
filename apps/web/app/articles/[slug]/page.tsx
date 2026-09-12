import { getCloudflareContext } from "@opennextjs/cloudflare";
import { extractHeadings, readArticleDocument } from "@my-knowledge/content";
import { Markdown } from "@my-knowledge/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getArticleEdition, getArticleMetadata, listArticleBacklinks, readEmbed } from "@/articles";
import { articleReturnHref } from "@/articles/navigation";
import { ArticleLink } from "@/articles/components/article-link";
import { articleOpenGraphVersion } from "@/articles/components/article-open-graph-card";
import { ArticleHeader } from "@/articles/components/article-header";
import { ArticleNavigationActions } from "@/articles/components/article-navigation-actions";
import { ArticleRelationList } from "@/articles/components/article-relations";
import { ReferencePosition } from "@/articles/components/referencePosition";
import { ArticleToc } from "@/articles/components/article-toc";
import { ArticleEditorShell } from "@/articles/components/editor-shell";
import { StructuredBlock } from "@/articles/components/structured-block";
import { getPrincipal } from "@/auth/owner";
import { getInterfaceI18n } from "@/i18n/server";

export async function generateMetadata({
  params,
}: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const [{ slug }, { env }] = await Promise.all([params, getCloudflareContext({ async: true })]);
  const article = await getArticleMetadata(env, slug);
  if (!article) return { title: "Article not found", robots: { index: false, follow: false } };
  const edition = article.editions.zh;
  const canonical = new URL(`/articles/${article.slug}`, env.BETTER_AUTH_URL);
  const socialImage = new URL(`/articles/${article.slug}/opengraph-image`, env.BETTER_AUTH_URL);
  socialImage.searchParams.set("v", `${article.contentHash}-${articleOpenGraphVersion}`);
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
  const edition = await getArticleEdition(
    env,
    principal,
    slug,
    principal === "owner" && query.edit === "1" ? "zh" : i18n.code,
  );
  if (!edition) notFound();
  const { article, locale, text } = edition;
  const returnHref = articleReturnHref(query.from);
  const context = returnHref === "/" ? "" : `&${new URLSearchParams({ from: returnHref })}`;
  if (principal === "owner" && query.edit === "1") {
    const zhEdition = text;
    const document = readArticleDocument(zhEdition.markdown);
    return (
      <div className="page-shell">
        <ArticleEditorShell
          article={{
            body: document.body,
            contentHash: article.contentHash,
            id: article.id,
            slug: article.slug,
            summary: zhEdition.summary,
            tags: article.tags,
            title: zhEdition.title,
            visibility: article.visibility,
          }}
          messages={i18n.messages.article}
          mode="edit"
        />
      </div>
    );
  }
  const backlinks = await listArticleBacklinks(env, principal, article);
  const headings = extractHeadings(text.markdown);
  return (
    <div className="page-shell article-reading-page relative">
      <article
        className="mx-auto min-w-0 w-full max-w-(--article-measure)"
        id="article"
        lang={locale === "zh" ? "zh-CN" : locale}
      >
        <div className="article-title-row">
          <ArticleHeader text={text.markdown} title={text.title}>
            <ArticleNavigationActions
              returnHref={returnHref}
              edit={
                principal === "owner"
                  ? { enabled: true, href: `/articles/${article.slug}?edit=1${context}` }
                  : { enabled: false }
              }
              messages={i18n.messages.article}
            />
          </ArticleHeader>
        </div>
        {headings.length > 0 ? (
          <ArticleToc
            headings={headings}
            key={locale}
            label={i18n.messages.article.tableOfContents}
          />
        ) : null}
        <Markdown
          embeds={readEmbed}
          link={ArticleLink}
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
        <div className="mt-10 border-t border-dashed pt-6">
          <ReferencePosition key={`${article.slug}:${locale}`} />
          <ArticleRelationList
            targetSlug={article.slug}
            articles={backlinks}
            empty={i18n.messages.article.noBacklinks}
            heading={i18n.messages.article.backlinks}
          />
        </div>
      </article>
    </div>
  );
}
