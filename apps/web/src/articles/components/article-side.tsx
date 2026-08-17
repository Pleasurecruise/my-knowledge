"use client";

import { Button } from "@my-knowledge/ui/components/button";
import { ArrowUp } from "@my-knowledge/ui/icons";
import { useEffect, useState } from "react";

import { ArticleNavigationActions } from "./article-navigation-actions";
import type { ArticleSideProps } from "./article-side.types";

const RADIUS = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ArticleSide({ edit, messages }: ArticleSideProps) {
  const [progress, setProgress] = useState(0);
  const [position, setPosition] = useState({ left: 0, offset: 40 });

  useEffect(() => {
    const article = document.getElementById("article");
    if (!article) return;

    const update = () => {
      const rect = article.getBoundingClientRect();
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable <= 0 ? 0 : Math.min(1, window.scrollY / scrollable));
      setPosition({
        left: Math.min(window.innerWidth - 56, rect.right + 32),
        offset: Math.max(0, Math.min(1, rect.top / Math.max(1, article.offsetTop))) * 40,
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const arrowProgress = Math.min(1, Math.max(0, (progress - 0.25) / 0.5));

  return (
    <aside
      aria-label={messages.read}
      className="hidden xl:fixed xl:z-20 xl:flex xl:max-h-[calc(100vh-16rem)] xl:w-10 xl:-translate-y-1/2 xl:flex-col xl:items-center xl:gap-1"
      style={{ left: position.left, top: `calc(50% + ${position.offset}px)` }}
    >
      <ArticleNavigationActions edit={edit} messages={messages} surface="rail" />
      <Button
        aria-label={messages.backToTop}
        className="group relative h-auto w-auto rounded-full p-1.5 text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        size="icon-sm"
        title={messages.backToTop}
        type="button"
        variant="ghost"
      >
        <svg aria-hidden="true" className="size-6 -rotate-90" viewBox="0 0 24 24">
          <circle
            className="text-border"
            cx="12"
            cy="12"
            fill="none"
            r={RADIUS}
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            className="text-foreground"
            cx="12"
            cy="12"
            fill="none"
            r={RADIUS}
            stroke="currentColor"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            strokeLinecap="round"
            strokeWidth="1.5"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-foreground transition-opacity"
          style={{ opacity: arrowProgress, scale: 0.5 + arrowProgress * 0.5 }}
        >
          <ArrowUp className="size-2.5" strokeWidth={2.25} />
        </span>
      </Button>
    </aside>
  );
}
