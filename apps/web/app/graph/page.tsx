import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";

import { listGraphArticles } from "@/articles";
import { getPrincipal } from "@/auth/owner";
import { KnowledgeGraph } from "@/graph/components/knowledge-graph";
import type { GraphEdge } from "@/graph/types";
import { getInterfaceI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getInterfaceI18n();
  return { title: i18n.messages.graph.title };
}

export default async function GraphPage() {
  const [{ env }, principal, i18n] = await Promise.all([
    getCloudflareContext({ async: true }),
    getPrincipal(),
    getInterfaceI18n(),
  ]);
  const records = await listGraphArticles(env, principal, 100);
  const visibleArticles = records.map(({ article }) => article);
  const known = new Map(visibleArticles.map((article) => [article.slug, article]));
  const relationships = records.flatMap(({ article, links }) =>
    links.flatMap((target) => {
      const linked = known.get(target);
      return linked ? [{ source: article, target: linked }] : [];
    }),
  );
  const explicitEdges: GraphEdge[] = relationships.map(({ source, target }) => ({
    source: source.id,
    target: target.id,
    type: "link",
  }));
  const tagEdges: GraphEdge[] = visibleArticles.flatMap((source, sourceIndex) =>
    visibleArticles
      .slice(sourceIndex + 1)
      .flatMap((target): GraphEdge[] =>
        source.tags.some((tag) => target.tags.includes(tag))
          ? [{ source: source.id, target: target.id, type: "tag" }]
          : [],
      ),
  );
  const nodes = visibleArticles.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.editions.zh.title,
    summary: article.editions.zh.summary,
    tags: article.tags,
  }));

  return (
    <KnowledgeGraph
      description={i18n.messages.graph.description}
      edges={[...explicitEdges, ...tagEdges]}
      messages={i18n.messages.graph}
      nodes={nodes}
      title={i18n.messages.graph.title}
    />
  );
}
