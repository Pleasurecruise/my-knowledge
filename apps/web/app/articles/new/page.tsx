import { getPrincipal } from "@/auth/owner";
import { ArticleEditorShell } from "@/articles/components/editor-shell";
import { getInterfaceI18n } from "@/i18n/server";
import { normalizeLocale } from "@my-knowledge/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getInterfaceI18n();
  return { title: i18n.messages.articles.newArticle, robots: { index: false, follow: false } };
}

export default async function NewArticlePage() {
  const [principal, i18n] = await Promise.all([getPrincipal(), getInterfaceI18n()]);
  if (principal !== "owner") notFound();
  const requested = normalizeLocale(i18n.code);
  const locale = requested.startsWith("zh") ? "zh" : requested;
  return (
    <div className="mx-auto max-w-280 px-4 pt-5 pb-20 sm:px-8 sm:pt-7 sm:pb-24">
      <ArticleEditorShell locale={locale} messages={i18n.messages.article} mode="create" />
    </div>
  );
}
