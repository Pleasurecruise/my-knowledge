import { useNavigate } from "@tanstack/react-router";
import { Button } from "@my-knowledge/ui/components/button";
import { Search, ArrowRight } from "@my-knowledge/ui/icons";
import { Input } from "@my-knowledge/ui/components/input";

import type { SearchFormProps } from "./search-form.types";

export function SearchForm({ messages, query }: SearchFormProps) {
  const navigate = useNavigate();
  return (
    <form
      action="/explore"
      className="search-field"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const search = new URLSearchParams();
        for (const [name, value] of new FormData(event.currentTarget))
          if (typeof value === "string") search.append(name, value);
        void navigate({ href: `/explore?${search}` });
      }}
    >
      <label className="sr-only" htmlFor="home-search">
        {messages.articleLabel}
      </label>
      <Search className="search-field-icon" aria-hidden="true" />
      <Input
        variant="search"
        defaultValue={query}
        id="home-search"
        name="query"
        placeholder={messages.articlePlaceholder}
        type="search"
      />
      <Button size="sm" type="submit">
        <span>{messages.submit}</span>
        <ArrowRight className="max-[720px]:hidden" aria-hidden="true" />
      </Button>
    </form>
  );
}
