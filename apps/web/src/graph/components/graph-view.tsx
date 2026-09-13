import type { ArticleSummary } from "@my-knowledge/content";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { articleLinkTargets, listGraphArticles } from "@/articles";
import { getPrincipal } from "@/auth/owner";
import { KnowledgeGraph } from "@/graph/components/knowledge-graph";
import type { GraphEdge } from "@/graph/types";
import { getInterfaceI18n } from "@/i18n/server";

export async function GraphView() {
  const [{ env }, principal, i18n] = await Promise.all([
    getCloudflareContext({ async: true }),
    getPrincipal(),
    getInterfaceI18n(),
  ]);
  const records = await listGraphArticles(env, principal, 100);
  const visibleArticles = records.map(({ article }) => article);
  const known = new Map<string, ArticleSummary>(
    visibleArticles.flatMap((article) =>
      articleLinkTargets(env.BETTER_AUTH_URL, article).map((target): [string, ArticleSummary] => [
        target,
        article,
      ]),
    ),
  );
  const relationships = records.flatMap(({ article, links }) =>
    [...new Set(links.map((target) => known.get(target)))].flatMap((linked) =>
      linked ? [{ source: article, target: linked }] : [],
    ),
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
    title: article.editions.zh.title,
    summary: article.editions.zh.summary,
    tags: article.tags,
  }));

  return (
    <KnowledgeGraph
      edges={[...explicitEdges, ...tagEdges]}
      messages={i18n.messages.graph}
      nodes={nodes}
    />
  );
}
