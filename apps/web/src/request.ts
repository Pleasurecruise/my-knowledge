import { getRequest } from "@tanstack/react-start/server";

type CacheNode<Result> = { result?: { value: Result }; next: Map<unknown, CacheNode<Result>> };

export function requestCache<Args extends unknown[], Result>(
  operation: (...args: Args) => Result,
): (...args: Args) => Result {
  const requests = new WeakMap<Request, CacheNode<Result>>();
  return (...args) => {
    const request = getRequest();
    let node = requests.get(request);
    if (!node) {
      node = { next: new Map() };
      requests.set(request, node);
    }
    for (const argument of args) {
      let child = node.next.get(argument);
      if (!child) {
        child = { next: new Map() };
        node.next.set(argument, child);
      }
      node = child;
    }
    if (node.result) return node.result.value;
    const value = operation(...args);
    node.result = { value };
    return value;
  };
}
