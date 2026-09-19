import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";

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
    <PageLayout action={null} hideTitle title={i18n.messages.articles.title}>
      <ArticleList
        articles={await localizeArticles(env, page.articles, i18n.code)}
        locale={i18n.code}
        empty={i18n.messages.articles.empty}
      />
      <footer className="home-footer">
        <a href="https://x.com/yiming9876" target="_blank" rel="noopener noreferrer">
          @yiming9876
        </a>
        <a href="https://design.you-find.me" target="_blank" rel="noopener noreferrer">
          Design
        </a>
        <a
          href="https://github.com/Pleasurecruise/my-knowledge"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code
        </a>
      </footer>
    </PageLayout>
  );
}
