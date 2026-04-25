/**
 * TanStack Query key factory for DynamoDB (Phase 5).
 *
 * Shape mirrors 05-RESEARCH.md §6.
 *
 * Pitfall 7.2.2: LastEvaluatedKey is a MAP of AttributeValues, not an opaque
 * token string. Callers JSON.stringify the ESK map before passing it as
 * `eskJson` here; hooks JSON.parse it before sending as ExclusiveStartKey.
 * Storing it as a string keeps the query key stable and serializable
 * (URL / Zustand / sessionStorage compatible).
 */
export const ddbKeys = {
  all: ['ddb'] as const,
  tables: () => ['ddb', 'tables'] as const,
  table: (name: string) => ['ddb', 'table', name] as const,
  scan: (name: string, filter: string | null, eskJson: string | null) =>
    ['ddb', 'scan', name, filter ?? null, eskJson ?? null] as const,
  query: (name: string, pkValue: string, eskJson: string | null) =>
    ['ddb', 'query', name, pkValue, eskJson ?? null] as const,
  item: (name: string, pkJson: string) =>
    ['ddb', 'item', name, pkJson] as const,
} as const
