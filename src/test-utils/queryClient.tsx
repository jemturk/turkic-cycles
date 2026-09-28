import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// A fresh, retry-free QueryClient per test, plus a wrapper for renderHook's
// `wrapper` option -- retries would otherwise make a mocked-rejection test hang
// waiting through backoff delays instead of failing immediately. gcTime: 0 makes
// an inactive query's cache entry (and the setTimeout that would otherwise hold it
// for the default 5 minutes) get cleared the moment the test's render unmounts,
// instead of leaving a timer open that keeps the whole Jest process alive.
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

export function createQueryWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}
