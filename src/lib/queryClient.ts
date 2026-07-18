import { QueryClient } from "@tanstack/react-query";

/**
 * Shared TanStack Query client for the storefront. Tuned for a read-mostly
 * catalog: data stays fresh for a minute, we don't refetch on every window
 * focus, and failed requests retry once before surfacing an error.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
