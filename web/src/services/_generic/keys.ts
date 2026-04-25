/**
 * TanStack Query key factory for the generic service framework.
 *
 * Stable tuple shapes let hooks invalidate by scope:
 *   - genericKeys.all                       → invalidates every generic query
 *   - genericKeys.list('iam.users')         → invalidates that service's list
 *   - genericKeys.item('iam.users', 'u-1')  → invalidates that single item
 */
export const genericKeys = {
  all: ['generic'] as const,
  list: (serviceKey: string) => ['generic', serviceKey, 'list'] as const,
  item: (serviceKey: string, id: string) =>
    ['generic', serviceKey, 'item', id] as const,
} as const
