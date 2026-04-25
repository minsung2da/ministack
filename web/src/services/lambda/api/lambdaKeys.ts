/**
 * TanStack Query key factory for Lambda resources.
 *
 * Shapes match RESEARCH §TanStack Query Keys — stable tuples used for
 * invalidation by prefix-match (Pitfall C-3).
 */
export const lambdaKeys = {
  all: ['lambda'] as const,
  functions: (marker: string | null = null) =>
    ['lambda', 'functions', marker ?? null] as const,
  function: (name: string) => ['lambda', 'function', name] as const,
  triggers: (name: string) => ['lambda', 'triggers', name] as const,
  functionUrl: (name: string) => ['lambda', 'functionUrl', name] as const,
} as const
