import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Shared hook-test wrapper: returns both the QueryClient (so tests can spy on
 * invalidateQueries — Pitfall C-3 assertions) and a Wrapper component.
 *
 * Uses createElement (not JSX) so callers can stay in `.ts` test files —
 * aligned with the Plan 00 test.todo stub files already committed.
 */
export function makeHookHarness(): {
  client: QueryClient
  Wrapper: ({ children }: { children: ReactNode }) => ReturnType<
    typeof createElement
  >
} {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
  return { client, Wrapper }
}
