import { Button } from "@my-knowledge/ui/components/button";
import { Input } from "@my-knowledge/ui/components/input";

import type { SearchFormProps } from "./search-form.types";

export function SearchForm({ messages, query }: SearchFormProps) {
  return (
    <form
      action="/"
      className="border-border flex flex-col gap-2 border-y py-3 sm:flex-row"
      role="search"
    >
      <label className="sr-only" htmlFor="home-search">
        {messages.articleLabel}
      </label>
      <Input
        className="h-12 flex-1 border-transparent bg-transparent px-4 shadow-none focus-visible:border-transparent focus-visible:ring-0"
        defaultValue={query}
        id="home-search"
        name="query"
        placeholder={messages.articlePlaceholder}
        type="search"
      />
      <Button className="h-12 px-6" type="submit">
        {messages.submit}
      </Button>
    </form>
  );
}
