import type { InterfaceMessages } from "@/i18n/registry";

export type DeleteActionProps = {
  expectedHash: string;
  expectedUpdatedAt: string;
  id: string;
  messages: InterfaceMessages["article"];
};
