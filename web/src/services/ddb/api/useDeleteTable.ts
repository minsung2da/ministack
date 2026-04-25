import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ddbJsonCall } from './ddbClient'
import { ddbKeys } from './ddbKeys'

/**
 * useDeleteTable — Mutation wrapping DeleteTable.
 *
 * Pitfall C-3: single invalidate at the closest ancestor — `ddbKeys.tables()`.
 * We deliberately do NOT also invalidate `ddbKeys.table(name)`; the detail
 * page remounts to an empty-state / redirect anyway.
 */
export function useDeleteTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (TableName: string) =>
      ddbJsonCall('DeleteTable', { TableName }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ddbKeys.tables() })
    },
  })
}
