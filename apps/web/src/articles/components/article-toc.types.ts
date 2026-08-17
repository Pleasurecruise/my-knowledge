import type { ArticleHeading } from "@my-knowledge/content";

export type ArticleTocProps = {
  headings: ArticleHeading[];
  label: string;
};

export type TocPhase = "collapsed" | "expanded" | "revealed";
