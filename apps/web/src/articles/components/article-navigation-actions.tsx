"use client";

import { Button, buttonVariants } from "@my-knowledge/ui/components/button";
import { ArrowLeft, Library, Pencil } from "@my-knowledge/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ArticleNavigationActionsProps } from "./article-navigation-actions.types";

export function ArticleNavigationActions({
  edit,
  messages,
  surface,
}: ArticleNavigationActionsProps) {
  const router = useRouter();

  if (surface === "rail") {
    return (
      <>
        <Button
          aria-label={messages.previousPage}
          className="h-auto w-auto rounded-full p-1.5 text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={() => router.back()}
          size="icon-sm"
          title={messages.previousPage}
          type="button"
          variant="ghost"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
        </Button>
        <Link
          aria-label={messages.allArticles}
          className={buttonVariants({
            className:
              "h-auto w-auto rounded-full p-1.5 text-muted-foreground hover:bg-transparent hover:text-foreground",
            size: "icon-sm",
            variant: "ghost",
          })}
          href="/articles"
          title={messages.allArticles}
        >
          <Library className="size-4" strokeWidth={2} />
        </Link>
        {edit.enabled ? (
          <Link
            aria-label={messages.edit}
            className={buttonVariants({
              className:
                "h-auto w-auto rounded-full p-1.5 text-muted-foreground hover:bg-transparent hover:text-foreground",
              size: "icon-sm",
              variant: "ghost",
            })}
            href={edit.href}
            title={messages.edit}
          >
            <Pencil className="size-4" strokeWidth={2} />
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex items-center xl:hidden">
      <Button
        aria-label={messages.previousPage}
        className="h-8 w-8 rounded-r-none text-muted-foreground"
        onClick={() => router.back()}
        size="icon-sm"
        title={messages.previousPage}
        type="button"
        variant="outline"
      >
        <ArrowLeft className="size-4" />
      </Button>
      <Link
        aria-label={messages.allArticles}
        className={buttonVariants({
          className: edit.enabled
            ? "-ml-px h-8 w-8 rounded-none text-muted-foreground"
            : "-ml-px h-8 w-8 rounded-l-none text-muted-foreground",
          size: "icon-sm",
          variant: "outline",
        })}
        href="/articles"
        title={messages.allArticles}
      >
        <Library className="size-4" />
      </Link>
      {edit.enabled ? (
        <Link
          aria-label={messages.edit}
          className={buttonVariants({
            className: "-ml-px h-8 w-8 rounded-l-none text-muted-foreground",
            size: "icon-sm",
            variant: "outline",
          })}
          href={edit.href}
          title={messages.edit}
        >
          <Pencil className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
