import { ArticleList } from "@/articles/components/article-list";
import { searchAiArticles, searchArticles } from "@/articles";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPrincipal } from "@/auth/owner";
import { getInterfaceI18n } from "@/i18n/server";
import { SearchForm } from "@/search/components/search-form";
import { PageLayout } from "@/shell/page-layout";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [query, { env }, principal, i18n] = await Promise.all([
    searchParams.then((value) => (typeof value.query === "string" ? value.query.trim() : "")),
    getCloudflareContext({ async: true }),
    getPrincipal(),
    getInterfaceI18n(),
  ]);
  const results = query
    ? principal === "owner"
      ? (await searchAiArticles(env, principal, query, 50)).map(({ article }) => article)
      : await searchArticles(env, principal, query, 50)
    : [];

  return (
    <PageLayout
      action={null}
      description={i18n.messages.home.introduction}
      title={i18n.messages.home.title}
      view="narrow"
    >
      <SearchForm messages={i18n.messages.search} query={query} />
      {query ? (
        <section aria-label={i18n.messages.search.results} className="mt-8">
          <ArticleList
            articles={results}
            empty={i18n.messages.search.noResults}
            entryUnit={i18n.messages.articles.entryUnit}
          />
        </section>
      ) : null}
    </PageLayout>
  );
}
