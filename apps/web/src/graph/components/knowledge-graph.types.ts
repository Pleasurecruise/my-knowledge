import type { GraphEdge, GraphNode } from "@/graph/types";
import type { InterfaceMessages } from "@/i18n/registry";

export type KnowledgeGraphProps = {
  description: string;
  edges: readonly GraphEdge[];
  messages: InterfaceMessages["graph"];
  nodes: readonly GraphNode[];
  title: string;
};
