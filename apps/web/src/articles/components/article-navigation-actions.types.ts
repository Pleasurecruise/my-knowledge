import type { InterfaceMessages } from "@/i18n/registry";

export type ArticleNavigationActionsProps = {
  articleHref: string;
  edit: { enabled: false } | { enabled: true; href: string };
  returnHref: string;
  messages: InterfaceMessages["article"];
};
