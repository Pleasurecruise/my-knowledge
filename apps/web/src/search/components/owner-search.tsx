"use client";

import { useActionState } from "react";
import { Search, ArrowRight } from "@my-knowledge/ui/icons";
import { Button } from "@my-knowledge/ui/components/button";
import { Input } from "@my-knowledge/ui/components/input";
import { ArticleList } from "@/articles/components/article-list";
import type { InterfaceMessages } from "@/i18n/registry";
import { searchKnowledge } from "../action";

export function OwnerSearch({
  messages,
  locale,
}: {
  messages: InterfaceMessages["search"];
  locale: string;
}) {
  const [state, action, pending] = useActionState(searchKnowledge, {
    articles: [],
    status: "idle",
  });
  return (
    <>
      <form action={action} className="search-field" role="search">
        <label className="sr-only" htmlFor="owner-search">
          {messages.articleLabel}
        </label>
        <Search aria-hidden="true" className="search-field-icon" />
        <Input
          variant="search"
          id="owner-search"
          name="query"
          type="search"
          required
          maxLength={2_000}
          autoComplete="off"
          placeholder={messages.articlePlaceholder}
        />
        <Button size="sm" type="submit" variant="outline" disabled={pending}>
          <span>{messages.submit}</span>
          <ArrowRight className="max-[720px]:hidden" aria-hidden="true" />
        </Button>
      </form>
      <section
        className="search-articles"
        aria-label={messages.results}
        aria-live="polite"
        aria-busy={pending}
      >
        {state.status === "error" ? <p role="alert">{messages.failed}</p> : null}
        {state.status === "ready" ? (
          <ArticleList
            articles={state.articles}
            order="relevance"
            locale={locale}
            empty={messages.noResults}
          />
        ) : null}
      </section>
    </>
  );
}
