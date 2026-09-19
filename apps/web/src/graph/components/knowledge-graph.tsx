"use client";

import { Badge } from "@my-knowledge/ui/components/badge";
import { ArrowRight } from "@my-knowledge/ui/icons";
import { Button, buttonVariants } from "@my-knowledge/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@my-knowledge/ui/components/card";
import { IntentLink as Link } from "@/shell/intent-link";
import { useMemo, useState } from "react";

import type { GraphEdge } from "../types";
import type { KnowledgeGraphProps } from "./knowledge-graph.types";

export function KnowledgeGraph({ edges, messages, nodes }: KnowledgeGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = nodes.at(0);
    return first ? first.id : null;
  });
  const [relationType, setRelationType] = useState<"all" | GraphEdge["type"]>("all");
  const visibleEdges = edges.filter((edge) => relationType === "all" || edge.type === relationType);
  const selected = nodes.find((node) => node.id === selectedId);
  const orderedNodes = nodes;
  const positions = useMemo(
    () =>
      new Map(
        orderedNodes.map((node, index): [string, { x: number; y: number }] => {
          const angle = (Math.PI * 2 * index) / orderedNodes.length - Math.PI / 2;
          const radius = Math.min(190, 100 + orderedNodes.length * 13);
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
      <p className="text-muted-foreground mx-auto max-w-240 border-y py-10 text-sm">
        {messages.empty}
      </p>
    );

  return (
    <div className="graph-workspace">
      <div className="graph-toolbar" role="group" aria-label={messages.relationships}>
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={relationType === "all"}
          onClick={() => setRelationType("all")}
        >
          {messages.all}
          <span>{edges.length}</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={relationType === "link"}
          onClick={() => setRelationType("link")}
        >
          <span className="graph-legend graph-legend-link" aria-hidden="true" />
          {messages.links}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={relationType === "tag"}
          onClick={() => setRelationType("tag")}
        >
          <span className="graph-legend graph-legend-tag" aria-hidden="true" />
          {messages.sharedTags}
        </Button>
      </div>
      <div className="graph-workspace-body">
        <div className="graph-stage">
          <svg
            aria-label={messages.canvas}
            className="graph-canvas"
            role="group"
            viewBox="0 -20 900 560"
          >
            <g aria-hidden="true">
              {visibleEdges.map((edge, index) => {
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
                  aria-pressed={selectedNode}
                  className="graph-node"
                  key={node.id}
                  onClick={() => setSelectedId(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(node.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  transform={`translate(${position.x} ${position.y})`}
                >
                  <circle className="graph-node-halo" r="29" />
                  <circle r={selectedNode ? 13 : 10} />
                  <text dy="1em" textAnchor="middle" y="26">
                    {node.title.length > 14 ? `${node.title.slice(0, 13)}…` : node.title}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="graph-sidebar">
          {selected ? (
            <Card aria-live="polite" size="sm">
              <CardHeader>
                <p className="text-primary text-xs font-medium">{messages.selected}</p>
                <CardTitle className="font-serif">{selected.title}</CardTitle>
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
                  className={buttonVariants({
                    className: "graph-read-action",
                    size: "sm",
                    variant: "outline",
                  })}
                  href={`/articles/${selected.id}`}
                >
                  {messages.readArticle}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <section aria-labelledby="relationships-heading" className="graph-relationships">
            <h2
              className="mb-2 text-xs font-normal text-muted-foreground"
              id="relationships-heading"
            >
              {messages.relationships}
            </h2>
            {visibleEdges.length === 0 ? (
              <p className="text-muted-foreground border-y py-5 text-sm leading-6">
                {messages.noRelationships}
              </p>
            ) : (
              <ol className="grid min-h-0 gap-1 overflow-y-auto">
                {visibleEdges.map((edge, index) => {
                  const source = nodesById.get(edge.source);
                  const target = nodesById.get(edge.target);
                  if (!source || !target)
                    throw new Error("Graph relationship references a missing node");
                  return (
                    <li
                      className="border-border grid gap-1 border-b py-3 text-xs last:border-b-0"
                      key={`${edge.source}:${edge.target}:${edge.type}:${index}`}
                    >
                      <Badge className="w-fit" variant="secondary">
                        {edge.type === "link" ? messages.links : messages.sharedTags}
                      </Badge>
                      <span className="min-w-0">
                        <Link
                          className="hover:text-primary font-medium"
                          href={`/articles/${source.id}`}
                        >
                          {source.title}
                        </Link>
                        <span aria-hidden="true"> → </span>
                        <Link
                          className="hover:text-primary font-medium"
                          href={`/articles/${target.id}`}
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
  );
}
