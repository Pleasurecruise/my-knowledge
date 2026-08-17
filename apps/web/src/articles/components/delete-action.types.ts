import type { InterfaceMessages } from "@/i18n/registry";

export type DeleteActionProps = {
  expectedHash: string;
  id: string;
  messages: InterfaceMessages["article"];
};
