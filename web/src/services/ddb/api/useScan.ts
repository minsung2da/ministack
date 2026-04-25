import { useQuery } from '@tanstack/react-query'
import { ddbJsonCall } from './ddbClient'
import { ddbKeys } from './ddbKeys'
import type { DdbItem } from '../../../shared/types/ddb'

/**
 * useScan — Scan with optional FilterExpression + LastEvaluatedKey pagination.
 *
 * Pitfall 7.2.2: ExclusiveStartKey is a MAP on the wire (not a stringified
 * token). We stringify it ONLY for the query key (to keep the key stable &
 * serializable); the body receives the map verbatim.
 */
export type ScanResult = {
  Items: DdbItem[]
  Count: number
  ScannedCount: number
  LastEvaluatedKey?: DdbItem
}

export function useScan(
  name: string,
  filter: string | null,
  esk: DdbItem | null,
) {
  const eskJson = esk ? JSON.stringify(esk) : null
  return useQuery<ScanResult>({
    queryKey: ddbKeys.scan(name, filter, eskJson),
    queryFn: () =>
      ddbJsonCall<ScanResult>('Scan', {
        TableName: name,
        ...(filter ? { FilterExpression: filter } : {}),
        // Pitfall 7.2.2: ESK rides in the body as a MAP, not a string.
        ...(esk ? { ExclusiveStartKey: esk } : {}),
      }),
    enabled: !!name,
  })
}
