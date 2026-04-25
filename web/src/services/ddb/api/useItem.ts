import { useQuery } from '@tanstack/react-query'
import { ddbJsonCall } from './ddbClient'
import { ddbKeys } from './ddbKeys'
import type { DdbItem } from '../../../shared/types/ddb'

/**
 * useItem — GetItem. A missing item returns `undefined` (§1.7 — response has
 * NO Item key). The caller distinguishes "loading" from "missing" via
 * React Query's `isPending` / data fields.
 */
export function useItem(name: string, key: DdbItem) {
  const pkJson = JSON.stringify(key)
  return useQuery<DdbItem | null>({
    queryKey: ddbKeys.item(name, pkJson),
    queryFn: async () => {
      const res = await ddbJsonCall<{ Item?: DdbItem }>('GetItem', {
        TableName: name,
        Key: key,
      })
      // §1.7: missing item → response has no Item key. Normalize to null because
      // TanStack Query rejects `undefined` as a valid queryFn return.
      return res.Item ?? null
    },
    enabled: !!name && Object.keys(key).length > 0,
  })
}
