import { ArticleList } from "@/articles/components/article-list";
import { searchArticles, localizeArticles } from "@/articles";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPrincipal } from "@/auth/owner";
import { getInterfaceI18n } from "@/i18n/server";
import { IntentLink } from "@/shell/intent-link";
import { ArrowRight } from "@my-knowledge/ui/icons";
import { SearchForm } from "@/search/components/search-form";
import { PageLayout } from "@/shell/page-layout";

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const [params, i18n] = await Promise.all([searchParams, getInterfaceI18n()]);
  const query = (Array.isArray(params.query) ? params.query[0] : params.query)?.trim() ?? "";
  const [{ env }, principal] = await Promise.all([
    getCloudflareContext({ async: true }),
    getPrincipal(),
  ]);
  const results = query ? await searchArticles(env, principal, query, 50) : [];

  return (
    <PageLayout action={null} title={i18n.messages.search.title}>
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
    </PageLayout>
  );
}
