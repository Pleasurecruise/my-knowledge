"use client";

import { useEffect, useRef, useState } from "react";

import type { ArticleTocProps, TocPhase } from "./article-toc.types";

const TOP_DEAD_ZONE = 64;
const MAX_WIDTH = 160;
const GAP = 32;

export function ArticleToc({ headings, label }: ArticleTocProps) {
  const [activeId, setActiveId] = useState("");
  const [phase, setPhase] = useState<TocPhase>("collapsed");
  const [barWidths, setBarWidths] = useState(() => new Map(headings.map(({ id }) => [id, 28])));
  const [position, setPosition] = useState({ left: 16, offset: 40 });
  const navRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clickScrollingRef = useRef(false);

  useEffect(() => {
    const article = document.getElementById("article");
    if (!article) return;

    const updatePosition = () => {
      const rect = article.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, rect.top / Math.max(1, article.offsetTop)));
      setPosition({
        left: Math.max(16, rect.left - MAX_WIDTH - GAP),
        offset: progress * 40,
      });
    };

    const updateActiveAtTop = () => {
      updatePosition();
      if (!clickScrollingRef.current && window.scrollY <= TOP_DEAD_ZONE) setActiveId("");
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updateActiveAtTop, { passive: true });
    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updateActiveAtTop);
    };
  }, []);

  useEffect(() => {
    const headingsInDocument = headings
      .map(({ id }) => document.getElementById(id))
      .filter((heading): heading is HTMLElement => heading instanceof HTMLElement);
    const observer = new IntersectionObserver(
      (entries) => {
        if (clickScrollingRef.current || window.scrollY <= TOP_DEAD_ZONE) return;
        const visible = entries.find(({ isIntersecting }) => isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );
    headingsInDocument.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [headings]);

  useEffect(() => {
    const sample = navRef.current?.querySelector(".toc__text");
    if (!(sample instanceof HTMLElement)) return;

    const measure = () => {
      const style = getComputedStyle(sample);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;
      context.font = [
        style.fontStyle,
        style.fontVariant,
        style.fontWeight,
        style.fontSize,
        style.fontFamily,
      ]
        .filter(Boolean)
        .join(" ");
      const measured = headings.map(({ id, title }): [string, number] => [
        id,
        context.measureText(title).width,
      ]);
      const values = measured.map(([, width]) => width);
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      setBarWidths(
        new Map(
          measured.map(([id, width]) => [
            id,
            maximum - minimum < 1
              ? 38
              : Math.round(20 + ((width - minimum) / (maximum - minimum)) * 36),
          ]),
        ),
      );
    };

    measure();
    void document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [headings]);

  const showText = phase === "revealed";

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className="hidden xl:fixed xl:z-20 xl:block xl:max-h-[calc(100vh-16rem)] xl:max-w-40 xl:-translate-y-1/2 xl:overflow-y-auto"
      onMouseEnter={() => {
        clearTimeout(timerRef.current);
        setPhase("expanded");
        timerRef.current = setTimeout(() => setPhase("revealed"), 180);
      }}
      onMouseLeave={() => {
        clearTimeout(timerRef.current);
        setPhase("collapsed");
      }}
      style={{ left: position.left, top: `calc(50% + ${position.offset}px)` }}
    >
      <ul
        className={`flex flex-col transition-[gap] duration-200 ${showText ? "gap-2" : "gap-1.5"}`}
      >
        {headings.map((heading) => {
          const active = activeId === heading.id;
          const indent = Math.max(0, heading.depth - 2) * 10 + 8;
          const barWidth = barWidths.get(heading.id);
          if (barWidth === undefined) throw new Error(`TOC width is missing: ${heading.id}`);
          return (
            <li className="relative" key={heading.id}>
              {active && showText ? (
                <span className="absolute top-0.75 left-0 h-3 w-0.5 rounded-full bg-foreground" />
              ) : null}
              <a
                className={`toc__link relative flex min-h-6 flex-col justify-center text-muted-foreground transition-colors ${active ? "text-foreground" : ""}`}
                href={`#${heading.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  const target = document.getElementById(heading.id);
                  if (!target) return;
                  clickScrollingRef.current = true;
                  setActiveId(heading.id);
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
                  history.replaceState(null, "", `#${heading.id}`);
                  const finish = () => {
                    clickScrollingRef.current = false;
                  };
                  if ("onscrollend" in window)
                    window.addEventListener("scrollend", finish, { once: true });
                  else setTimeout(finish, 600);
                }}
                style={{ paddingLeft: indent }}
                title={heading.title}
              >
                <span
                  className={`block rounded-full bg-current transition-all duration-200 ${showText ? "h-0 opacity-0" : `h-1 ${active ? "opacity-90" : "opacity-20"}`}`}
                  style={{ width: showText ? 0 : barWidth }}
                />
                <span
                  className={`toc__text block overflow-hidden truncate text-[11px] leading-snug transition-all duration-150 ${showText ? `h-auto opacity-100 ${active ? "font-medium" : ""}` : "h-0 opacity-0"}`}
                >
                  {heading.title}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
