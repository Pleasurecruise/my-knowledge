import Form from "next/form";
import { Button } from "@my-knowledge/ui/components/button";
import { Search, ArrowRight } from "@my-knowledge/ui/icons";
import { Input } from "@my-knowledge/ui/components/input";

import type { SearchFormProps } from "./search-form.types";

export function SearchForm({ messages, query }: SearchFormProps) {
  return (
    <Form action="/explore" className="search-field" role="search">
      <label className="sr-only" htmlFor="home-search">
        {messages.articleLabel}
      </label>
      <Search className="search-field-icon" aria-hidden="true" />
      <Input
        defaultValue={query}
        id="home-search"
        name="query"
        placeholder={messages.articlePlaceholder}
        type="search"
      />
      <Button type="submit">
        <span>{messages.submit}</span>
        <ArrowRight aria-hidden="true" />
      </Button>
    </Form>
  );
}
