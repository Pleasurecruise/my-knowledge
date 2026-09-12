import { Search, Network } from "@my-knowledge/ui/icons";
import type { InterfaceMessages } from "@/i18n/registry";
import { IntentLink } from "./intent-link";

export function ExplorationToggle({
  graph,
  query,
  messages,
}: {
  graph: boolean;
  query: string;
  messages: InterfaceMessages;
}) {
  const search = new URLSearchParams();
  if (query) search.set("query", query);
  const searchHref = search.size ? `/explore?${search}` : "/explore";
  search.set("view", "graph");
  return (
    <div className="exploration-toggle">
      <IntentLink
        href={searchHref}
        aria-label={messages.home.title}
        title={messages.home.title}
        aria-current={!graph ? "page" : undefined}
      >
        <Search aria-hidden="true" />
      </IntentLink>
      <IntentLink
        href={`/explore?${search}`}
        aria-label={messages.graph.title}
        title={messages.graph.title}
        aria-current={graph ? "page" : undefined}
      >
        <Network aria-hidden="true" />
      </IntentLink>
    </div>
  );
}
