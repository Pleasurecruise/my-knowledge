import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { listArticles, localizeArticles } from "@/articles";
import { ArticleList } from "@/articles/components/article-list";
import { getPrincipal } from "@/auth/owner";
import { getInterfaceI18n } from "@/i18n/server";
import { useInterfaceI18n } from "@/i18n/client";
import { PageLayout } from "@/shell/page-layout";
import { siteDescription, siteName } from "@/shell/site";

const getHome = createServerFn({ method: "GET" }).handler(async () => {
  const i18n = getInterfaceI18n();
  const page = await listArticles(env, await getPrincipal(), {
    cursor: undefined,
    limit: 100,
    tags: [],
    visibility: undefined,
  });
  return {
    articles: await localizeArticles(env, page.articles, i18n.code),
    origin: new URL(env.BETTER_AUTH_URL).origin,
  };
});

export const Route = createFileRoute("/")({
  loader: () => getHome(),
  head: ({ loaderData }) => ({
    meta: [
      { title: siteName },
      { property: "og:title", content: siteName },
      { property: "og:description", content: siteDescription },
      ...(loaderData ? [{ property: "og:url", content: loaderData.origin }] : []),
      { property: "og:site_name", content: siteName },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: siteName },
      { name: "twitter:description", content: siteDescription },
    ],
    links: loaderData ? [{ rel: "canonical", href: loaderData.origin }] : [],
  }),
  component: HomePage,
});

function HomePage() {
  const { articles } = Route.useLoaderData();
  const i18n = useInterfaceI18n();

  return (
    <PageLayout action={null} hideTitle title={i18n.messages.articles.title}>
      <ArticleList articles={articles} locale={i18n.code} empty={i18n.messages.articles.empty} />
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
