"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function MarkdownBody({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const figures = root.current?.querySelectorAll<HTMLElement>(".markdown-embed-annotation");
    if (!figures?.length) return;
    const update = () => {
      for (const figure of figures) {
        const mark = figure.querySelector(".annotation-mark");
        const note = figure.querySelector(".annotation-note > a, .annotation-note > span");
        const caption = figure.querySelector<HTMLElement>(".annotation-note");
        const svg = figure.querySelector("svg");
        const path = svg?.querySelector("path");
        const target = mark && Array.from(mark.getClientRects()).at(-1);
        if (!target || !note || !caption || !svg || !path) continue;
        const box = figure.getBoundingClientRect();
        const x = (target.left + target.right) / 2 - box.left;
        const y = target.bottom - box.top + 3;
        caption.style.paddingLeft = "0px";
        const minimumWidth = Math.min(note.getBoundingClientRect().width, 160);
        caption.style.paddingLeft = `${Math.max(24, Math.min(x + 24, box.width - minimumWidth))}px`;
        const label = note.getBoundingClientRect();
        const startX = label.left - box.left - 7;
        const startY = label.top - box.top + parseFloat(getComputedStyle(note).lineHeight) / 2;
        svg.setAttribute("viewBox", `0 0 ${box.width} ${figure.getBoundingClientRect().height}`);
        path.setAttribute(
          "d",
          `M${startX} ${startY} C${startX - 16} ${startY} ${x} ${y + 14} ${x} ${y} M${x - 3} ${y + 5} L${x} ${y} L${x + 3} ${y + 5}`,
        );
        svg.style.visibility = "visible";
      }
    };
    const observer = new ResizeObserver(update);
    figures.forEach((figure) => observer.observe(figure));
    document.fonts.addEventListener("loadingdone", update);
    update();
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", update);
    };
  }, [children]);
  return (
    <div className="markdown-body" ref={root}>
      {children}
    </div>
  );
}
