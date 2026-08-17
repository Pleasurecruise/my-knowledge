import type { InterfaceMessages } from "@/i18n/registry";

export type SearchMode = "keyword" | "ai";

export type SearchFormProps = {
  isOwner: boolean;
  messages: InterfaceMessages["search"];
  query: string;
};
