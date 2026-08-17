"use client";

import type {
  CanvasBlockProps,
  MermaidBlockProps,
  StructuredBlockProps,
  VegaBlockProps,
} from "@my-knowledge/ui/structured-block.types";
import dynamic from "next/dynamic";

const MermaidBlock = dynamic<MermaidBlockProps>(
  () => import("@my-knowledge/ui/mermaid-block").then((module) => module.MermaidBlock),
  { ssr: false },
);
const VegaBlock = dynamic<VegaBlockProps>(
  () => import("@my-knowledge/ui/vega-block").then((module) => module.VegaBlock),
  { ssr: false },
);
const CanvasBlock = dynamic<CanvasBlockProps>(
  () => import("@my-knowledge/ui/canvas-block").then((module) => module.CanvasBlock),
  { ssr: false },
);

export function StructuredBlock(props: StructuredBlockProps) {
  if (props.language === "mermaid")
    return (
      <MermaidBlock
        diagram={props.diagram}
        renderingDiagram={props.renderingDiagram}
        source={props.source}
      />
    );
  if (props.language === "json-canvas")
    return (
      <CanvasBlock
        canvas={props.canvas}
        canvasRelationships={props.canvasRelationships}
        canvasViewport={props.canvasViewport}
        source={props.source}
        spatialView={props.spatialView}
      />
    );
  return <VegaBlock chart={props.chart} source={props.source} />;
}
