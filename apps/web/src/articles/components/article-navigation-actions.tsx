"use client";

import { useContext } from "react";
import { ArticleReturnContext } from "./reading-trail";
import { Pencil } from "@my-knowledge/ui/icons";

import { IntentLink } from "@/shell/intent-link";
import type { ArticleNavigationActionsProps } from "./article-navigation-actions.types";

export function ArticleNavigationActions({
  edit,
  messages,
  returnHref,
}: ArticleNavigationActionsProps) {
  const destination = useContext(ArticleReturnContext) ?? returnHref;
  return (
    <div className="article-reading-actions">
      <IntentLink
        className="article-return hover:text-foreground"
        href={destination}
        aria-label={messages.previousPage}
      >
        <span aria-hidden="true">← </span>
        {messages.previousPage}
      </IntentLink>
      {edit.enabled ? (
        <IntentLink
          className="article-edit"
          href={edit.href}
          aria-label={messages.edit}
          title={messages.edit}
        >
          <Pencil aria-hidden="true" />
        </IntentLink>
      ) : null}
    </div>
  );
}
