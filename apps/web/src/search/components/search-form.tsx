"use client";

import { Button } from "@my-knowledge/ui/components/button";
import { Card, CardContent } from "@my-knowledge/ui/components/card";
import { Input } from "@my-knowledge/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@my-knowledge/ui/components/tabs";
import { useState } from "react";

import { aiResultSchema, type AiResult } from "@/search/types";

import type { SearchFormProps, SearchMode } from "./search-form.types";

export function SearchForm({ isOwner, messages, query }: SearchFormProps) {
  const [mode, setMode] = useState<SearchMode>("keyword");
  const [answer, setAnswer] = useState<AiResult>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function ask(form: FormData) {
    if (mode === "keyword") return;
    const value = form.get("query");
    const query = typeof value === "string" ? value.trim() : "";
    if (!query) return;
    setAnswer(undefined);
    setError(undefined);
    setIsLoading(true);
    try {
      const response = await fetch("/api/search/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error("Knowledge search request failed");
      setAnswer(aiResultSchema.parse(await response.json()));
    } catch {
      setError(messages.unavailable);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {isOwner ? (
        <Tabs
          className="mb-3 items-center"
          onValueChange={(value) => {
            if (value !== "keyword" && value !== "ai") throw new Error("Invalid search mode");
            setMode(value);
          }}
          value={mode}
        >
          <TabsList aria-label={messages.modes}>
            <TabsTrigger value="keyword">{messages.keyword}</TabsTrigger>
            <TabsTrigger value="ai">{messages.ai}</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <form
        action={mode === "keyword" ? "/" : ask}
        className="border-border flex flex-col gap-2 border-y py-3 sm:flex-row"
        role="search"
      >
        <label className="sr-only" htmlFor="home-search">
          {mode === "keyword" ? messages.articleLabel : messages.questionLabel}
        </label>
        <Input
          className="h-12 flex-1 border-transparent bg-transparent px-4 shadow-none focus-visible:border-transparent focus-visible:ring-0"
          id="home-search"
          name="query"
          defaultValue={query}
          placeholder={
            mode === "keyword" ? messages.articlePlaceholder : messages.questionPlaceholder
          }
          type="search"
        />
        <Button className="h-12 px-6" disabled={isLoading} type="submit">
          {isLoading ? messages.searching : mode === "keyword" ? messages.submit : messages.ask}
        </Button>
      </form>

      {error ? (
        <p className="text-destructive mt-3 text-left text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <div
          aria-label={messages.searching}
          className="mt-5 space-y-3 rounded-md border p-4 motion-safe:animate-pulse"
          role="status"
        >
          <div className="h-3 w-4/5 rounded-sm bg-muted" />
          <div className="h-3 w-full rounded-sm bg-muted" />
          <div className="h-3 w-2/3 rounded-sm bg-muted" />
        </div>
      ) : null}
      {answer ? (
        <Card className="mt-5 text-left" size="sm">
          <CardContent className="space-y-4">
            <p className="leading-7">{answer.answer}</p>
            <ul className="flex flex-wrap gap-2">
              {answer.citations.map((citation) => (
                <li key={citation.id}>
                  <Button
                    render={<a href={`/articles/${citation.slug}`} />}
                    size="sm"
                    variant="outline"
                  >
                    {citation.title}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
