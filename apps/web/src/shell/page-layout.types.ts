import type { ReactNode } from "react";

export type PageLayoutProps = {
  action: ReactNode | null;
  children: ReactNode;
  description: string;
  title: string;
  view: "narrow" | "wide";
};
