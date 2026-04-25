import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ddbJsonCall } from './ddbClient'
import { marshalScalar } from './attributeValue'
import type {
  DdbItem,
  DdbScalarType,
} from '../../../shared/types/ddb'

/**
 * usePutItem — Mutation wrapping PutItem.
 *
 * D-06: scalar marshal happens HERE at the hook boundary. UI components
 * submit `{ type, value }` pairs in native JS shape; the AttributeValue
 * wire shape (`{S: …}`, `{N: '42'}`) exists only on the wire.
 *
 * Pitfall 7.2.1: `marshalScalar` always `String()`s numeric input.
 * Pitfall C-3: single predicate-based invalidate — covers BOTH the
 * `['ddb', 'scan', tableName, …]` pages and `['ddb', 'item', tableName, …]`
 * exact keys in a single `invalidateQueries` call.
 */
export type PutItemAttr = {
  type: DdbScalarType
  value: string | number | boolean | null
}

export type PutItemInput = Record<string, PutItemAttr>

export function usePutItem(tableName: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attrs: PutItemInput) => {
      // D-06: marshal at the HOOK boundary so UI never authors AttributeValues.
      const Item: DdbItem = Object.fromEntries(
        Object.entries(attrs).map(([k, a]) => [
          k,
          marshalScalar(a.value, a.type),
        ]),
      )
      return ddbJsonCall('PutItem', { TableName: tableName, Item })
    },
    // Pitfall C-3: ONE invalidateQueries call with a predicate that matches
    // every ['ddb', <op>, tableName, …] entry — scan pages + item details.
    onSuccess: () => {
      void qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'ddb' &&
          q.queryKey[2] === tableName,
      })
    },
  })
}
