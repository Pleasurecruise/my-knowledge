import type { InterfaceMessages } from "@/i18n/registry";

export type ArticleNavigationActionsProps = {
  edit: { enabled: false } | { enabled: true; href: string };
  messages: InterfaceMessages["article"];
  surface: "mobile" | "rail";
};
