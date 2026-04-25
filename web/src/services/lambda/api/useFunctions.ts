import { useQuery } from '@tanstack/react-query'
import { lambdaGet } from './lambdaClient'
import { lambdaKeys } from './lambdaKeys'
import type { LambdaFunctionSummary } from '../../../shared/types'

export type ListFunctionsResponse = {
  Functions: LambdaFunctionSummary[]
  NextMarker?: string
}

/**
 * Query hook — GET /2015-03-31/functions (ListFunctions).
 *
 * Marker-based pagination (AWS-native; not page numbers). `placeholderData`
 * keeps the prior page visible while the next page is fetched so the table
 * does not flash empty between clicks.
 *
 * [LAM-01]
 */
export function useFunctions(marker: string | null = null, maxItems = 50) {
  return useQuery<ListFunctionsResponse>({
    queryKey: lambdaKeys.functions(marker),
    queryFn: () => {
      const sp: Record<string, string> = { MaxItems: String(maxItems) }
      if (marker) sp.Marker = marker
      return lambdaGet<ListFunctionsResponse>('/2015-03-31/functions', sp)
    },
    placeholderData: (prev) => prev,
  })
}
