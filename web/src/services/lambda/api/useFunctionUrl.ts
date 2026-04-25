import { useQuery } from '@tanstack/react-query'
import { lambdaGet } from './lambdaClient'
import { lambdaKeys } from './lambdaKeys'
import type { LambdaFunctionUrl } from '../../../shared/types'

export type ListFunctionUrlConfigsResponse = {
  FunctionUrlConfigs: LambdaFunctionUrl[]
}

/**
 * Query hook — GET /2021-10-31/functions/{name}/urls (ListFunctionUrlConfigs,
 * plural). The List endpoint returns 200 + empty array when no URL is
 * configured — we do NOT use the singular Get endpoint because that returns
 * 404 for the "not configured" case and would require branching.
 *
 * [D-07] [LAM-03]
 */
export function useFunctionUrl(name: string) {
  return useQuery<ListFunctionUrlConfigsResponse>({
    queryKey: lambdaKeys.functionUrl(name),
    enabled: Boolean(name),
    queryFn: () =>
      lambdaGet<ListFunctionUrlConfigsResponse>(
        `/2021-10-31/functions/${encodeURIComponent(name)}/urls`,
      ),
  })
}
