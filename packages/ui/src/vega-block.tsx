"use client";

import embed from "vega-embed";
import { useCallback } from "react";

import type { VegaBlockProps } from "./structured-block.types";

export function VegaBlock({ chart, source }: VegaBlockProps) {
  const mount = useCallback(
    (target: HTMLDivElement) => {
      function render() {
        target.replaceChildren();
        const style = getComputedStyle(document.documentElement);
        const text = style.getPropertyValue("--foreground").trim();
        const border = style.getPropertyValue("--border").trim();
        return embed(target, JSON.parse(source), {
          actions: false,
          renderer: "svg",
          config: {
            background: style.getPropertyValue("--background").trim(),
            font: "Geist",
            mark: { color: style.getPropertyValue("--primary").trim() },
            axis: {
              labelColor: text,
              titleColor: text,
              gridColor: border,
              domainColor: border,
              tickColor: border,
            },
            legend: { labelColor: text, titleColor: text },
            title: { color: text },
            view: { stroke: border },
          },
        });
      }

      let rendering = render();
      const observer = new MutationObserver(() => {
        rendering = rendering.then(({ view }) => {
          view.finalize();
          return render();
        });
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });

      return () => {
        observer.disconnect();
        void rendering.then(({ view }) => view.finalize());
      };
    },
    [source],
  );

  return (
    <figure className="structured-block chart-block" aria-label={chart}>
      <div ref={mount} />
    </figure>
  );
}
