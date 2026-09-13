"use client";

import { useContext, useState } from "react";
import { ArticleReturnContext } from "./reading-trail";
import { Share2, Pencil } from "@my-knowledge/ui/icons";

import { toast } from "@my-knowledge/ui/components/toast";

import { IntentLink } from "@/shell/intent-link";
import type { ArticleNavigationActionsProps } from "./article-navigation-actions.types";

export function ArticleNavigationActions({
  articleHref,
  edit,
  messages,
  returnHref,
}: ArticleNavigationActionsProps) {
  const destination = useContext(ArticleReturnContext) ?? returnHref;
  const [copying, setCopying] = useState(false);
  async function copyLink() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(new URL(articleHref, window.location.origin).href);
      toast.add({ id: "article-link", title: messages.linkCopied });
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "NotAllowedError") throw error;
      toast.add({ id: "article-link", title: messages.linkCopyFailed });
    } finally {
      setCopying(false);
    }
  }
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
      <div className="article-share">
        <button
          type="button"
          className="article-copy"
          aria-label={messages.copyLink}

          disabled={copying}
          onClick={() => void copyLink()}
        >
          <Share2 aria-hidden="true" />
        </button>
      </div>
      {edit.enabled ? (
        <IntentLink className="article-edit" href={edit.href} aria-label={messages.edit}>
          <Pencil aria-hidden="true" />
        </IntentLink>
      ) : null}
    </div>
  );
}
