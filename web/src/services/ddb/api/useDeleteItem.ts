import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ddbJsonCall } from './ddbClient'
import type { DdbItem } from '../../../shared/types/ddb'

/**
 * useDeleteItem — DeleteItem by key map.
 *
 * Pitfall C-3: single predicate-based invalidate scoped to this tableName.
 */
export type DeleteItemInput = {
  key: DdbItem
}

export function useDeleteItem(tableName: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: DeleteItemInput) =>
      ddbJsonCall('DeleteItem', {
        TableName: tableName,
        Key: input.key,
      }),
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
