"use client";

import { Button } from "@my-knowledge/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@my-knowledge/ui/components/tooltip";
import { Moon, Sun } from "@my-knowledge/ui/icons";
import { applyTheme, themeStorageKey, type Theme } from "@my-knowledge/ui/lib/theme";
import type { MouseEvent } from "react";

import type { InterfaceMessages } from "@/i18n/registry";

export function ThemeAction({ messages }: { messages: InterfaceMessages["shell"] }) {
  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(themeStorageKey, next);
    applyTheme(next, event.currentTarget);
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={messages.theme}
            onClick={toggle}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <Moon className="dark:hidden" />
        <Sun className="hidden dark:block" />
      </TooltipTrigger>
      <TooltipContent>{messages.theme}</TooltipContent>
    </Tooltip>
  );
}
