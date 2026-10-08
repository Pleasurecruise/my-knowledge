import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultGcTime: 0,
    scrollRestoration: true,
    scrollRestorationBehavior: "instant",
    parseSearch: (search) => Object.fromEntries(new URLSearchParams(search)),
    stringifySearch: (search) => {
      const params = new URLSearchParams();
      for (const [name, value] of Object.entries(search))
        if (typeof value === "string") params.append(name, value);
      return params.size ? `?${params}` : "";
    },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
