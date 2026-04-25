import { useQuery } from '@tanstack/react-query'
import { ddbJsonCall } from './ddbClient'
import { ddbKeys } from './ddbKeys'

/**
 * useTables — DynamoDB ListTables.
 *
 * Fresh MiniStack backends may return a response with no TableNames key;
 * we normalize that to an empty array so downstream UI never sees undefined.
 */
export type ListTablesResult = { TableNames: string[] }

export function useTables() {
  return useQuery<ListTablesResult>({
    queryKey: ddbKeys.tables(),
    queryFn: async () => {
      const res = await ddbJsonCall<{ TableNames?: string[] }>(
        'ListTables',
        {},
      )
      return { TableNames: res.TableNames ?? [] }
    },
  })
}
