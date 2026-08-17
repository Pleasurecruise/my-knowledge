import { jsonCanvasSchema } from "@my-knowledge/content";
import { useId } from "react";

import type { CanvasBlockProps } from "./structured-block.types";

export function CanvasBlock({
  canvas,
  canvasRelationships,
  canvasViewport,
  source,
  spatialView,
}: CanvasBlockProps) {
  const marker = `canvas-arrow-${useId().replaceAll(":", "")}`;
  const parsed = jsonCanvasSchema.parse(JSON.parse(source));
  const nodes = new Map(parsed.nodes.map((node) => [node.id, node]));
  const minX = Math.min(...parsed.nodes.map((node) => node.x));
  const minY = Math.min(...parsed.nodes.map((node) => node.y));
  const maxX = Math.max(...parsed.nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...parsed.nodes.map((node) => node.y + node.height));
  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <figure aria-label={canvas} className="structured-block canvas-block">
      <figcaption>
        <span>{canvas}</span>
        <small>{spatialView}</small>
      </figcaption>
      <div aria-label={canvasViewport} className="canvas-viewport" role="region" tabIndex={0}>
        <div className="canvas-scene" style={{ aspectRatio: `${width} / ${height}` }}>
          <svg
            aria-hidden="true"
            className="canvas-scene__edges"
            preserveAspectRatio="none"
            viewBox={`0 0 ${width} ${height}`}
          >
            <defs>
              <marker
                id={marker}
                markerHeight="8"
                markerWidth="8"
                orient="auto"
                refX="7"
                refY="4"
                viewBox="0 0 8 8"
              >
                <path d="M0 0 8 4 0 8Z" />
              </marker>
            </defs>
            {parsed.edges.map((edge) => {
              const sourceNode = nodes.get(edge.fromNode);
              const targetNode = nodes.get(edge.toNode);
              if (!sourceNode || !targetNode)
                throw new Error("JSON Canvas edge references a missing node");
              return (
                <line
                  key={edge.id}
                  markerEnd={`url(#${marker})`}
                  x1={sourceNode.x - minX + sourceNode.width / 2}
                  x2={targetNode.x - minX + targetNode.width / 2}
                  y1={sourceNode.y - minY + sourceNode.height / 2}
                  y2={targetNode.y - minY + targetNode.height / 2}
                />
              );
            })}
          </svg>
          <ol className="canvas-nodes">
            {parsed.nodes.map((node, index) => (
              <li
                key={node.id}
                style={{
                  height: `${(node.height / height) * 100}%`,
                  left: `${((node.x - minX) / width) * 100}%`,
                  top: `${((node.y - minY) / height) * 100}%`,
                  width: `${(node.width / width) * 100}%`,
                  zIndex: index + 1,
                }}
              >
                <span>{node.text}</span>
                <small>{String(index + 1).padStart(2, "0")}</small>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {parsed.edges.length > 0 ? (
        <ol className="canvas-edges" aria-label={canvasRelationships}>
          {parsed.edges.map((edge) => {
            const sourceNode = nodes.get(edge.fromNode);
            const targetNode = nodes.get(edge.toNode);
            if (!sourceNode || !targetNode)
              throw new Error("JSON Canvas relationship references a missing node");
            return (
              <li key={edge.id}>
                {sourceNode.text} → {targetNode.text}
                {edge.label ? ` · ${edge.label}` : ""}
              </li>
            );
          })}
        </ol>
      ) : null}
    </figure>
  );
}
