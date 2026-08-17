import type { InterfaceMessages } from "@/i18n/registry";

export type ArticleSideProps = {
  edit: { enabled: false } | { enabled: true; href: string };
  messages: InterfaceMessages["article"];
};
