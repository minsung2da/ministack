import { useQuery } from '@tanstack/react-query'
import { ddbJsonCall } from './ddbClient'
import { ddbKeys } from './ddbKeys'
import type { DdbTableDescription } from '../../../shared/types/ddb'

/**
 * useTable — DescribeTable + derived hashKey / sortKey from KeySchema.
 *
 * UI needs the PK/SK attribute NAMES (not indices) to label item editor
 * fields, so we flatten them here instead of at every call site.
 */
export type DescribeTableResult = DdbTableDescription & {
  hashKey: string | null
  sortKey: string | null
}

export function useTable(name: string) {
  return useQuery<DescribeTableResult>({
    queryKey: ddbKeys.table(name),
    queryFn: async () => {
      const res = await ddbJsonCall<{ Table: DdbTableDescription }>(
        'DescribeTable',
        { TableName: name },
      )
      const hashEntry = res.Table.KeySchema.find((k) => k.KeyType === 'HASH')
      const sortEntry = res.Table.KeySchema.find((k) => k.KeyType === 'RANGE')
      return {
        ...res.Table,
        hashKey: hashEntry?.AttributeName ?? null,
        sortKey: sortEntry?.AttributeName ?? null,
      }
    },
    enabled: !!name,
  })
}
