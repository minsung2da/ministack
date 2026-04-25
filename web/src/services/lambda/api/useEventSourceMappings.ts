import { useQuery } from '@tanstack/react-query'
import { lambdaGet } from './lambdaClient'
import { lambdaKeys } from './lambdaKeys'
import type { LambdaEventSourceMapping } from '../../../shared/types'

export type ListEventSourceMappingsResponse = {
  EventSourceMappings: LambdaEventSourceMapping[]
  NextMarker?: string
}

/**
 * Query hook — GET /2015-03-31/event-source-mappings?FunctionName={name}.
 *
 * [Pitfall 7] The filter query param is `FunctionName` (exact spelling).
 * Using `Function` silently returns every mapping — the backend does not
 * 400 on unknown query keys.
 *
 * Disabled when `functionName` is empty.
 *
 * [LAM-03]
 */
export function useEventSourceMappings(functionName: string) {
  return useQuery<ListEventSourceMappingsResponse>({
    queryKey: lambdaKeys.triggers(functionName),
    enabled: Boolean(functionName),
    queryFn: () =>
      lambdaGet<ListEventSourceMappingsResponse>(
        '/2015-03-31/event-source-mappings',
        { FunctionName: functionName },
      ),
  })
}
