"use client";

import { Badge } from "@my-knowledge/ui/components/badge";
import { buttonVariants } from "@my-knowledge/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@my-knowledge/ui/components/card";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageLayout } from "@/shell/page-layout";

import type { KnowledgeGraphProps } from "./knowledge-graph.types";

export function KnowledgeGraph({
  description,
  edges,
  messages,
  nodes,
  title,
}: KnowledgeGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = nodes.at(0);
    return first ? first.id : null;
  });
  const selected = nodes.find((node) => node.id === selectedId);
  const orderedNodes = nodes;
  const positions = useMemo(
    () =>
      new Map(
        orderedNodes.map((node, index): [string, { x: number; y: number }] => {
          const angle = (Math.PI * 2 * index) / orderedNodes.length - Math.PI / 2;
          const radius = Math.min(190, 42 + orderedNodes.length * 13);
          return [
            node.id,
            { x: 450 + Math.cos(angle) * radius, y: 250 + Math.sin(angle) * radius },
          ];
        }),
      ),
    [orderedNodes],
  );
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  if (nodes.length === 0)
    return (
      <PageLayout action={null} description={description} title={title} view="wide">
        <p className="text-muted-foreground border-y py-10 text-sm">{messages.empty}</p>
      </PageLayout>
    );

  return (
    <PageLayout action={null} description={description} title={title} view="wide">
      <div className="space-y-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="graph-stage border-border overflow-hidden rounded-lg border shadow-[var(--shadow-spatial)]">
            <svg
              aria-label={messages.canvas}
              className="graph-canvas"
              role="img"
              viewBox="0 0 900 500"
            >
              <defs>
                <filter height="180%" id="node-shadow" width="180%" x="-40%" y="-40%">
                  <feDropShadow dx="0" dy="8" floodOpacity="0.18" stdDeviation="7" />
                </filter>
              </defs>
              <g aria-hidden="true">
                {edges.map((edge, index) => {
                  const source = positions.get(edge.source);
                  const target = positions.get(edge.target);
                  if (!source || !target) throw new Error("Graph edge references a hidden node");
                  return (
                    <line
                      className={`graph-edge graph-edge--${edge.type}`}
                      key={`${edge.source}:${edge.target}:${edge.type}:${index}`}
                      x1={source.x}
                      x2={target.x}
                      y1={source.y}
                      y2={target.y}
                    />
                  );
                })}
              </g>
              {orderedNodes.map((node) => {
                const position = positions.get(node.id);
                if (!position) throw new Error("Graph node position is missing");
                const selectedNode = selectedId === node.id;
                return (
                  <g
                    aria-label={`${messages.inspect} ${node.title}`}
                    className="graph-node"
                    key={node.id}
                    onClick={() => setSelectedId(node.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedId(node.id);
                    }}
                    role="button"
                    tabIndex={0}
                    transform={`translate(${position.x} ${position.y})`}
                  >
                    <circle filter="url(#node-shadow)" r={selectedNode ? 33 : 27} />
                    <text textAnchor="middle" y="48">
                      {node.title.length > 14 ? `${node.title.slice(0, 13)}…` : node.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="space-y-5 xl:sticky xl:top-24 xl:grid xl:grid-rows-[18rem_auto] xl:self-start xl:space-y-0 xl:gap-5">
            {selected ? (
              <Card aria-live="polite" className="xl:h-72" size="sm">
                <CardHeader>
                  <p className="text-primary text-xs font-medium">{messages.selected}</p>
                  <CardTitle>{selected.title}</CardTitle>
                </CardHeader>
                <CardContent className="min-h-0 space-y-3 overflow-y-auto">
                  <p className="text-muted-foreground leading-6">{selected.summary}</p>
                  <ul aria-label={messages.tags} className="flex flex-wrap gap-1.5">
                    {selected.tags.map((tag) => (
                      <li key={tag}>
                        <Badge variant="outline">{tag}</Badge>
                      </li>
                    ))}
                  </ul>
                  <Link
                    className={buttonVariants({ className: "w-full", size: "sm" })}
                    href={`/articles/${selected.slug}`}
                  >
                    {messages.readArticle}
                  </Link>
                </CardContent>
              </Card>
            ) : null}

            <section aria-labelledby="relationships-heading">
              <h2 className="font-heading mb-3 text-sm font-semibold" id="relationships-heading">
                {messages.relationships}
              </h2>
              {edges.length === 0 ? (
                <p className="text-muted-foreground border-y py-5 text-sm leading-6">
                  {messages.noRelationships}
                </p>
              ) : (
                <ol className="grid gap-2 xl:max-h-72 xl:overflow-y-auto xl:pr-1">
                  {edges.map((edge, index) => {
                    const source = nodesById.get(edge.source);
                    const target = nodesById.get(edge.target);
                    if (!source || !target)
                      throw new Error("Graph relationship references a missing node");
                    return (
                      <li
                        className="border-border grid gap-1 border-b py-2.5 text-sm first:border-t"
                        key={`${edge.source}:${edge.target}:${edge.type}:${index}`}
                      >
                        <Badge className="w-fit" variant="secondary">
                          {edge.type === "link" ? messages.links : messages.sharedTags}
                        </Badge>
                        <span className="min-w-0">
                          <Link
                            className="hover:text-primary font-medium"
                            href={`/articles/${source.slug}`}
                          >
                            {source.title}
                          </Link>
                          <span aria-hidden="true"> → </span>
                          <Link
                            className="hover:text-primary font-medium"
                            href={`/articles/${target.slug}`}
                          >
                            {target.title}
                          </Link>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
