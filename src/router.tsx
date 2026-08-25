import {QueryClient} from "@tanstack/react-query";
import {createRouter} from "@tanstack/react-router";
import {setupRouterSsrQueryIntegration} from "@tanstack/react-router-ssr-query";
import {routeTree} from "./routeTree.gen";

/**
 * Wires a single QueryClient into both the router's context (so route
 * loaders can dehydrate/prefetch through it) and the client component
 * tree (so useQuery/useQueryClient calls in components have a provider
 * to read from). Without this, every useQuery call in the app throws
 * "No QueryClient set, use QueryClientProvider to set one" the moment
 * a real page tries to render — confirmed by reproducing exactly that
 * error against a live dev server before this fix.
 */
export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: {queryClient},
    defaultPreload: "intent",
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({router, queryClient});

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
