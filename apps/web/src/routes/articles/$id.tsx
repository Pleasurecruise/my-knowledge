import { readArticleDocument } from "@my-knowledge/content";
import { Markdown } from "@my-knowledge/ui";
import { compileMarkdown } from "@my-knowledge/ui/markdown-compiler";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { getArticleEdition, getArticleMetadata, readEmbed } from "@/articles";
import { articleReturnHref } from "@/articles/navigation";
import { ArticleAddress } from "@/articles/components/article-address";
import { ArticleHeader } from "@/articles/components/article-header";
import { ArticleLink } from "@/articles/components/article-link";
import { ArticleLoading } from "@/articles/components/loading";
import { ArticleNavigationActions } from "@/articles/components/article-navigation-actions";
import { articleOpenGraphVersion } from "@/articles/components/article-open-graph-card";
import type { ExistingArticleEditor } from "@/articles/components/article-editor.types";
import { ArticleEditorShell } from "@/articles/components/editor-shell";
import { ReferencePosition } from "@/articles/components/referencePosition";
import { StructuredBlock } from "@/articles/components/structured-block";
import { getPrincipal } from "@/auth/owner";
import { interfaceLocales } from "@/i18n/registry";
import { getInterfaceI18n } from "@/i18n/server";
import { useInterfaceI18n } from "@/i18n/client";
import { siteAuthor, siteName } from "@/shell/site";

const articleSearchSchema = z.object({
  edit: z.string().optional(),
  from: z.string().optional(),
  locale: z.string().optional(),
});

const getArticleMetadataTags = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const article = await getArticleMetadata(env, data.id);
    if (!article) return null;
    const edition = article.editions.zh;
    const canonical = new URL(`/articles/${article.id}`, env.BETTER_AUTH_URL);
    const socialImage = new URL(`/articles/${article.id}/opengraph-image`, env.BETTER_AUTH_URL);
    socialImage.searchParams.set("v", `${article.contentHash}-${articleOpenGraphVersion}`);
    return {
      canonical: canonical.href,
      createdAt: article.createdAt,
      socialImage: socialImage.href,
      summary: edition.summary,
      tags: article.tags,
      title: edition.title,
      updatedAt: article.updatedAt,
    };
  });

const getArticlePage = createServerFn({ method: "GET" })
  .validator(articleSearchSchema.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    const principal = await getPrincipal();
    const i18n = getInterfaceI18n();
    const editing = principal === "owner" && data.edit === "1";
    const requestedLocale = editing && data.locale === "zh" ? "zh-CN" : i18n.code;
    const edition = await getArticleEdition(env, principal, data.id, requestedLocale);
    if (!edition) throw notFound();
    const { article, locale, text } = edition;
    const document = readArticleDocument(text.markdown);
    const returnHref = articleReturnHref(data.from);
    const context = returnHref === "/" ? "" : `&${new URLSearchParams({ from: returnHref })}`;
    if (editing) {
      if (locale === "zh" && requestedLocale !== "zh-CN")
        throw redirect({ href: `/articles/${article.id}?edit=1&locale=zh${context}` });
      const editor: ExistingArticleEditor = {
        locale: locale === "en" || locale === "ja" ? locale : "zh",
        body: document.body,
        contentHash: article.contentHash,
        updatedAt: article.updatedAt,
        id: article.id,
        summary: text.summary,
        tags: article.tags,
        title: text.title,
        visibility: article.visibility,
      };
      return { editor, editorLocale: requestedLocale };
    }
    const labels = {
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
    };
    const compiled = await compileMarkdown({
      cache: article.visibility === "public" ? env.KNOWLEDGE_CACHE : null,
      enrich: true,
      labels,
      markdown: document.body,
    });
    return {
      compiled,
      context,
      editable: principal === "owner",
      embeds: compiled.deferredEmbeds.map((embed) => readEmbed(embed)),
      id: article.id,
      labels,
      lang: locale === "zh" ? "zh-CN" : locale,
      locale,
      returnHref,
      structuredData:
        article.visibility === "public"
          ? JSON.stringify({
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
            }).replaceAll("<", "\\u003c")
          : null,
      title: text.title,
    };
  });

export const Route = createFileRoute("/articles/$id")({
  validateSearch: articleSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const [metadata, page] = await Promise.all([
      getArticleMetadataTags({ data: { id: params.id } }),
      getArticlePage({ data: { ...deps, id: params.id } }),
    ]);
    return { metadata, page };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { metadata } = loaderData;
    if (!metadata)
      return {
        meta: [
          { title: `Article not found · ${siteName}` },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    return {
      meta: [
        { title: `${metadata.title} · ${siteName}` },
        { name: "description", content: metadata.summary },
        { name: "keywords", content: metadata.tags.join(",") },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: metadata.title },
        { property: "og:description", content: metadata.summary },
        { property: "og:url", content: metadata.canonical },
        { property: "og:site_name", content: siteName },
        { property: "og:image", content: metadata.socialImage },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: metadata.title },
        { property: "og:type", content: "article" },
        { property: "article:published_time", content: metadata.createdAt },
        { property: "article:modified_time", content: metadata.updatedAt },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: metadata.title },
        { name: "twitter:description", content: metadata.summary },
        { name: "twitter:image", content: metadata.socialImage },
        { name: "twitter:image:alt", content: metadata.title },
      ],
      links: [{ rel: "canonical", href: metadata.canonical }],
    };
  },
  pendingComponent: ArticleLoading,
  pendingMs: 0,
  pendingMinMs: 0,
  component: ArticlePage,
});

function ArticlePage() {
  const { metadata, page } = Route.useLoaderData();
  const i18n = useInterfaceI18n();
  const tags = metadata?.tags.map((tag) => <meta content={tag} key={tag} property="article:tag" />);
  if ("editor" in page) {
    const editorI18n = interfaceLocales.find((entry) => entry.code === page.editorLocale);
    if (!editorI18n) throw new Error("Editor interface locale is not registered");
    return (
      <div className="page-shell" data-article-id={page.editor.id}>
        {tags}
        <ArticleAddress id={page.editor.id} />
        <ArticleEditorShell
          article={page.editor}
          messages={editorI18n.messages.article}
          mode="edit"
        />
      </div>
    );
  }
  return (
    <div className="page-shell article-reading-page relative">
      {tags}
      <article
        className="mx-auto min-w-0 w-full max-w-(--article-measure)"
        id="article"
        data-article-id={page.id}
        lang={page.lang}
      >
        <div className="article-title-row">
          <ArticleHeader title={page.title}>
            <ArticleNavigationActions
              key={page.id}
              articleHref={`/articles/${page.id}`}
              returnHref={page.returnHref}
              edit={
                page.editable
                  ? { enabled: true, href: `/articles/${page.id}?edit=1${page.context}` }
                  : { enabled: false }
              }
              messages={i18n.messages.article}
            />
          </ArticleHeader>
        </div>
        <Markdown
          compiled={page.compiled}
          embeds={page.embeds}
          link={ArticleLink}
          labels={page.labels}
          structuredBlock={StructuredBlock}
        />
        <ArticleAddress id={page.id} />
        {page.structuredData === null ? null : (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: page.structuredData }}
          />
        )}
        <ReferencePosition key={`${page.id}:${page.locale}`} />
      </article>
    </div>
  );
}
