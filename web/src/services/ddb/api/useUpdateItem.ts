import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ddbJsonCall } from './ddbClient'
import { marshalScalar } from './attributeValue'
import type {
  DdbAttributeValue,
  DdbItem,
} from '../../../shared/types/ddb'
import type { PutItemAttr } from './usePutItem'

/**
 * useUpdateItem — SET-only UpdateExpression (§1.9 — REMOVE / ADD / DELETE
 * deferred to a later phase).
 *
 * Builds `#n_<k> = :v_<k>` placeholders for every dirty field so attribute
 * NAMES that collide with reserved words (Name, Status, …) remain safe.
 *
 * Pitfall C-3: single predicate-based invalidate — see usePutItem for
 * rationale.
 */
export type UpdateItemInput = {
  key: DdbItem
  updates: Record<string, PutItemAttr>
}

export function useUpdateItem(tableName: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateItemInput) => {
      const names: Record<string, string> = {}
      const values: Record<string, DdbAttributeValue> = {}
      const setParts: string[] = []
      for (const [k, a] of Object.entries(input.updates)) {
        const nameAlias = `#n_${k}`
        const valueAlias = `:v_${k}`
        names[nameAlias] = k
        values[valueAlias] = marshalScalar(a.value, a.type)
        setParts.push(`${nameAlias} = ${valueAlias}`)
      }
      return ddbJsonCall('UpdateItem', {
        TableName: tableName,
        Key: input.key,
        // §1.9: SET-only. No REMOVE / ADD / DELETE operators this phase.
        UpdateExpression: `SET ${setParts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      })
    },
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
