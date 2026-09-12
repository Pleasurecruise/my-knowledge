import { getPrincipal } from "@/auth/owner";
import { ArticleEditorShell } from "@/articles/components/editor-shell";
import { getInterfaceI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getInterfaceI18n();
  return { title: messages.articles.newArticle, robots: { index: false, follow: false } };
}

export default async function NewArticlePage() {
  const [principal, { messages }] = await Promise.all([getPrincipal(), getInterfaceI18n()]);
  if (principal !== "owner") notFound();
  return (
    <div className="page-shell">
      <ArticleEditorShell messages={messages.article} mode="create" />
    </div>
  );
}
