"use client";

import mermaid from "mermaid";
import { useCallback, useId } from "react";

import type { MermaidBlockProps } from "./structured-block.types";

export function MermaidBlock({ diagram, renderingDiagram, source }: MermaidBlockProps) {
  const id = `mermaid-${useId().replaceAll(":", "")}`;
  const mount = useCallback(
    (target: HTMLDivElement) => {
      let version = 0;

      async function render() {
        version += 1;
        target.textContent = renderingDiagram;
        const style = getComputedStyle(document.documentElement);
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            darkMode: document.documentElement.dataset.theme === "dark",
            background: style.getPropertyValue("--background").trim(),
            primaryColor: style.getPropertyValue("--muted").trim(),
            primaryTextColor: style.getPropertyValue("--foreground").trim(),
            primaryBorderColor: style.getPropertyValue("--primary").trim(),
            lineColor: style.getPropertyValue("--muted-foreground").trim(),
            secondaryColor: style.getPropertyValue("--muted").trim(),
            tertiaryColor: style.getPropertyValue("--background").trim(),
            fontFamily: style.getPropertyValue("--type-interface").trim(),
          },
        });
        const { svg } = await mermaid.render(`${id}-${version}`, source);
        target.innerHTML = svg;
      }

      let rendering = render();
      const observer = new MutationObserver(() => {
        rendering = rendering.then(render);
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });

      return () => {
        observer.disconnect();
      };
    },
    [id, renderingDiagram, source],
  );

  return (
    <figure className="structured-block diagram-block" aria-label={diagram}>
      <div ref={mount} />
    </figure>
  );
}
