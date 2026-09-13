import type { ReactNode } from "react";

export type PageLayoutProps = {
  action: ReactNode | null;
  children: ReactNode;
  hideTitle?: boolean;
  title: string;
};
