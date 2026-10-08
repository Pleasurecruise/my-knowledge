import { ArrowRight } from "@my-knowledge/ui/icons";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { localizeArticles, searchArticles } from "@/articles";
import { ArticleList } from "@/articles/components/article-list";
import { getPrincipal } from "@/auth/owner";
import { getInterfaceI18n } from "@/i18n/server";
import { useInterfaceI18n } from "@/i18n/client";
import { SearchForm } from "@/search/components/search-form";
import { IntentLink } from "@/shell/intent-link";
import { PageLayout } from "@/shell/page-layout";
import { siteName } from "@/shell/site";

const exploreSearchSchema = z.object({ query: z.string().optional() });

const getExplore = createServerFn({ method: "GET" })
  .validator(z.object({ query: z.string() }))
  .handler(async ({ data }) => {
    const i18n = getInterfaceI18n();
    const page = {
      canonical: new URL("/explore", env.BETTER_AUTH_URL).href,
      title: i18n.messages.search.title,
    };
    if (!data.query) return { ...page, articles: null };
    const results = await searchArticles(env, await getPrincipal(), data.query, 50);
    return { ...page, articles: await localizeArticles(env, results, i18n.code) };
  });

export const Route = createFileRoute("/explore")({
  validateSearch: exploreSearchSchema,
  loaderDeps: ({ search }) => ({ query: search.query }),
  loader: async ({ deps }) => {
    const query = deps.query?.trim() ?? "";
    return { ...(await getExplore({ data: { query } })), query, indexed: deps.query === undefined };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.title} · ${siteName}` },
            ...(loaderData.indexed ? [] : [{ name: "robots", content: "noindex, follow" }]),
          ],
          links: [{ rel: "canonical", href: loaderData.canonical }],
        }
      : {},
  component: ExplorePage,
});

function ExplorePage() {
  const { articles, query } = Route.useLoaderData();
  const i18n = useInterfaceI18n();

  return (
    <PageLayout action={null} title={i18n.messages.search.title}>
      <SearchForm messages={i18n.messages.search} query={query} />
      {articles ? (
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
            articles={articles}
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
    </PageLayout>
  );
}
