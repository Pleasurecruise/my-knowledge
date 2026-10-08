import type { StructuredBlockProps } from "@my-knowledge/ui/structured-block.types";
import { ClientOnly } from "@tanstack/react-router";
import { createClientOnlyFn } from "@tanstack/react-start";
import { lazy, Suspense, type ReactNode } from "react";

const MermaidBlock = lazy(
  createClientOnlyFn(() =>
    import("@my-knowledge/ui/mermaid-block").then((module) => ({ default: module.MermaidBlock })),
  ),
);
const VegaBlock = lazy(
  createClientOnlyFn(() =>
    import("@my-knowledge/ui/vega-block").then((module) => ({ default: module.VegaBlock })),
  ),
);
const CanvasBlock = lazy(
  createClientOnlyFn(() =>
    import("@my-knowledge/ui/canvas-block").then((module) => ({ default: module.CanvasBlock })),
  ),
);

function Deferred({ children }: { children: ReactNode }) {
  return (
    <ClientOnly>
      <Suspense fallback={null}>{children}</Suspense>
    </ClientOnly>
  );
}

export function StructuredBlock(props: StructuredBlockProps) {
  if (props.language === "mermaid")
    return (
      <Deferred>
        <MermaidBlock
          diagram={props.diagram}
          renderingDiagram={props.renderingDiagram}
          source={props.source}
        />
      </Deferred>
    );
  if (props.language === "json-canvas")
    return (
      <Deferred>
        <CanvasBlock
          canvas={props.canvas}
          canvasRelationships={props.canvasRelationships}
          canvasViewport={props.canvasViewport}
          source={props.source}
          spatialView={props.spatialView}
        />
      </Deferred>
    );
  return (
    <Deferred>
      <VegaBlock chart={props.chart} source={props.source} />
    </Deferred>
  );
}
