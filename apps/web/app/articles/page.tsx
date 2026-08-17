import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Plus } from "@my-knowledge/ui/icons";
import type { Metadata } from "next";
import Link from "next/link";

import { listArticles } from "@/articles";
import { ArticleList } from "@/articles/components/article-list";
import { getPrincipal } from "@/auth/owner";
import { defaultInterfaceLocale } from "@/i18n/registry";
import { getInterfaceI18n } from "@/i18n/server";
import { PageLayout } from "@/shell/page-layout";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getInterfaceI18n();
  return { title: i18n.messages.articles.title };
}

export default async function ArticlesPage() {
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
        principal === "owner" && i18n.code === defaultInterfaceLocale ? (
          <Link
            aria-label={i18n.messages.articles.newArticle}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            href="/articles/new"
          >
            <Plus className="size-3" />
            {i18n.messages.articles.newArticle}
          </Link>
        ) : null
      }
      description={i18n.messages.articles.description}
      title={i18n.messages.articles.title}
      view="narrow"
    >
      <ArticleList
        articles={page.articles}
        empty={i18n.messages.articles.empty}
        entryUnit={i18n.messages.articles.entryUnit}
      />
    </PageLayout>
  );
}
