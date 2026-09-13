import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import { House } from "@my-knowledge/ui/icons";

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
          href="https://github.com/Pleasurecruise"
          aria-label="GitHub"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 21v-3c-4 1-4-2-6-3M16 21v-4c0-1-.4-1.8-1-2.2 3-.4 5-2 5-5 0-1.4-.4-2.4-1.2-3.3.3-1.1.3-2.3-.1-3.5-1.7 0-3.1.8-4 1.5a13 13 0 0 0-5.4 0C8.4 3.8 7 3 5.3 3c-.4 1.2-.4 2.4-.1 3.5C4.4 7.4 4 8.4 4 9.8c0 3 2 4.6 5 5-.6.4-1 1.2-1 2.2" />
          </svg>
        </a>
        <a
          href="https://oh.you-find.me"
          aria-label="oh.you-find.me"
          target="_blank"
          rel="noopener noreferrer"
        >
          <House aria-hidden="true" />
        </a>
      </footer>
    </PageLayout>
  );
}
