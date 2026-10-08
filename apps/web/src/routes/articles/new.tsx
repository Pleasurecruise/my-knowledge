import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { ArticleEditorShell } from "@/articles/components/editor-shell";
import { getPrincipal } from "@/auth/owner";
import { getInterfaceI18n } from "@/i18n/server";
import { useInterfaceI18n } from "@/i18n/client";
import { siteName } from "@/shell/site";

const getNewArticle = createServerFn({ method: "GET" }).handler(async () => {
  if ((await getPrincipal()) !== "owner") throw notFound();
  return { title: getInterfaceI18n().messages.articles.newArticle };
});

export const Route = createFileRoute("/articles/new")({
  loader: () => getNewArticle(),
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.title} · ${siteName}` },
            { name: "robots", content: "noindex, nofollow" },
          ],
        }
      : {},
  component: NewArticlePage,
});

function NewArticlePage() {
  const { messages } = useInterfaceI18n();
  return (
    <div className="page-shell">
      <ArticleEditorShell messages={messages.article} mode="create" />
    </div>
  );
}
