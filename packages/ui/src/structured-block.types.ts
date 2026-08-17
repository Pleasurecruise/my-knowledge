export type StructuredBlockLabels = {
  canvas: string;
  canvasRelationships: string;
  canvasViewport: string;
  chart: string;
  diagram: string;
  renderingDiagram: string;
  spatialView: string;
};

export type MermaidBlockProps = Pick<StructuredBlockLabels, "diagram" | "renderingDiagram"> & {
  source: string;
};

export type VegaBlockProps = Pick<StructuredBlockLabels, "chart"> & {
  source: string;
};

export type CanvasBlockProps = Pick<
  StructuredBlockLabels,
  "canvas" | "canvasRelationships" | "canvasViewport" | "spatialView"
> & {
  source: string;
};

export type StructuredBlockProps =
  | ({ language: "mermaid" } & MermaidBlockProps)
  | ({ language: "vega" | "vega-lite" } & VegaBlockProps)
  | ({ language: "json-canvas" } & CanvasBlockProps);
