import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buttonVariants } from "@my-knowledge/ui/components/button";
import { Plus } from "@my-knowledge/ui/icons";
import type { Metadata } from "next";
import Link from "next/link";

import { listArticles, localizeArticles } from "@/articles";
import { ArticleList } from "@/articles/components/article-list";
import { getPrincipal } from "@/auth/owner";
import { redirect } from "next/navigation";
import { getInterfaceI18n } from "@/i18n/server";
import { PageLayout } from "@/shell/page-layout";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getInterfaceI18n();
  return { title: i18n.messages.articles.title };
}

export default async function ArticlesPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const query = Array.isArray(params.query) ? params.query[0] : params.query;
  if (query?.trim()) redirect(`/explore?${new URLSearchParams({ query: query.trim() })}`);
  const [{ env }, principal, i18n] = await Promise.all([
    getCloudflareContext({ async: true }),
    getPrincipal(),
    getInterfaceI18n(),
  ]);
  const page = await listArticles(env, principal, {
    cursor: undefined,
    limit: 100,
    tags: [],
    visibility: undefined,
  });

  return (
    <PageLayout
      action={
        principal === "owner" ? (
          <Link
            aria-label={i18n.messages.articles.newArticle}
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href="/articles/new"
          >
            <Plus aria-hidden="true" className="size-4" />
            {i18n.messages.articles.newArticle}
          </Link>
        ) : null
      }
      description={i18n.messages.articles.description}
      title={i18n.messages.articles.title}
      view="narrow"
    >
      <ArticleList
        articles={await localizeArticles(env, page.articles, i18n.code)}
        locale={i18n.code}
        empty={i18n.messages.articles.empty}
        entryUnit={i18n.messages.articles.entryUnit}
      />
    </PageLayout>
  );
}
