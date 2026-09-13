import { ArticleList } from "@/articles/components/article-list";
import { searchAiArticles, searchArticles, localizeArticles } from "@/articles";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPrincipal } from "@/auth/owner";
import { getInterfaceI18n } from "@/i18n/server";
import { IntentLink } from "@/shell/intent-link";
import { Suspense } from "react";
import { GraphView } from "@/graph/components/graph-view";
import { GraphLoading } from "@/graph/components/graph-loading";
import { ExplorationToggle } from "@/shell/exploration-toggle";
import { ArrowRight } from "@my-knowledge/ui/icons";
import { SearchForm } from "@/search/components/search-form";
import { PageLayout } from "@/shell/page-layout";

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const [params, i18n] = await Promise.all([searchParams, getInterfaceI18n()]);
  const query = (Array.isArray(params.query) ? params.query[0] : params.query)?.trim() ?? "";
  const graph = params.view === "graph";
  const action = <ExplorationToggle graph={graph} query={query} messages={i18n.messages} />;
  const [{ env }, principal] = await Promise.all([
    getCloudflareContext({ async: true }),
    getPrincipal(),
  ]);
  const results =
    !graph && query
      ? principal === "owner"
        ? (await searchAiArticles(env, principal, query, 50)).map(({ article }) => article)
        : await searchArticles(env, principal, query, 50)
      : [];

  return (
    <PageLayout
      action={action}
      title={graph ? i18n.messages.graph.title : i18n.messages.home.title}
    >
      {graph ? (
        <Suspense fallback={<GraphLoading />}>
          <GraphView />
        </Suspense>
      ) : (
        <>
          <SearchForm messages={i18n.messages.search} query={query} />
          {query ? (
            <section aria-label={i18n.messages.search.results} className="search-articles">
              <div className="search-articles-heading">
                <h2>{i18n.messages.search.results}</h2>
                <IntentLink href="/">
                  {i18n.messages.article.allArticles}
                  <ArrowRight aria-hidden="true" />
                </IntentLink>
              </div>
              <ArticleList
                order="relevance"
                articles={await localizeArticles(env, results, i18n.code)}
                locale={i18n.code}
                empty={i18n.messages.search.noResults}
              />
            </section>
          ) : (
            <div className="search-destinations">
              <IntentLink href="/">
                {i18n.messages.article.allArticles}
                <ArrowRight aria-hidden="true" />
              </IntentLink>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
