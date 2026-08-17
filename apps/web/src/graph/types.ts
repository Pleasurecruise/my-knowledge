export type GraphNode = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  tags: readonly string[];
};

export type GraphEdge = {
  source: string;
  target: string;
  type: "link" | "tag";
};
