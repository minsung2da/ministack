import { useQuery } from '@tanstack/react-query'
import { ddbJsonCall } from './ddbClient'
import { ddbKeys } from './ddbKeys'
import type { DdbItem } from '../../../shared/types/ddb'

/**
 * useDdbQuery — DynamoDB Query against the BASE TABLE only.
 *
 * Renamed to avoid collision with React Query's `useQuery`. Index-based
 * Query is intentionally out of scope (CONTEXT "deferred" list — IndexName
 * support lands in a future phase).
 */
export type DdbQueryResult = {
  Items: DdbItem[]
  Count: number
  ScannedCount: number
  LastEvaluatedKey?: DdbItem
}

export function useDdbQuery(
  name: string,
  pkName: string,
  pkValue: string,
  esk: DdbItem | null = null,
) {
  const eskJson = esk ? JSON.stringify(esk) : null
  return useQuery<DdbQueryResult>({
    queryKey: ddbKeys.query(name, pkValue, eskJson),
    queryFn: () =>
      ddbJsonCall<DdbQueryResult>('Query', {
        TableName: name,
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeNames: { '#pk': pkName },
        ExpressionAttributeValues: { ':pk': { S: pkValue } },
        ...(esk ? { ExclusiveStartKey: esk } : {}),
      }),
    enabled: !!name && !!pkValue,
  })
}
