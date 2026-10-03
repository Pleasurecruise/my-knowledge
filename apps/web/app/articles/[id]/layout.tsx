import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notFound } from "next/navigation";

import { getArticleRow } from "@/articles";
import { getPrincipal } from "@/auth/owner";

export default async function ArticleLayout({ children, params }: LayoutProps<"/articles/[id]">) {
  const [{ id }, { env }, principal] = await Promise.all([
    params,
    getCloudflareContext({ async: true }),
    getPrincipal(),
  ]);
  if (!(await getArticleRow(env, principal, decodeURIComponent(id)))) notFound();
  return children;
}
