import { getPrincipal } from "@/auth/owner";
import { ArticleEditorShell } from "@/articles/components/editor-shell";
import { zh } from "@/i18n/messages/zh";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  return { title: zh.articles.newArticle, robots: { index: false, follow: false } };
}

export default async function NewArticlePage() {
  const principal = await getPrincipal();
  if (principal !== "owner") notFound();
  return (
    <div className="mx-auto max-w-5xl px-4 pt-5 pb-20 sm:px-6 sm:pt-7 sm:pb-24 lg:px-8">
      <ArticleEditorShell messages={zh.article} mode="create" />
    </div>
  );
}
