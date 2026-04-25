import { useQuery } from '@tanstack/react-query'
import { lambdaGet } from './lambdaClient'
import { lambdaKeys } from './lambdaKeys'
import type { LambdaFunctionConfiguration } from '../../../shared/types'

export type GetFunctionResponse = {
  Configuration: LambdaFunctionConfiguration
  Code: {
    RepositoryType: 'S3' | 'ECR'
    Location?: string
    ImageUri?: string
  }
  Tags: Record<string, string>
  Concurrency?: { ReservedConcurrentExecutions: number }
}

/**
 * Query hook — GET /2015-03-31/functions/{name} (GetFunction).
 *
 * Drives the detail page. Disabled when `name` is empty so the page can
 * render (e.g. during route transitions) without firing a request to
 * `/functions/`.
 *
 * [LAM-03]
 */
export function useFunction(name: string) {
  return useQuery<GetFunctionResponse>({
    queryKey: lambdaKeys.function(name),
    enabled: Boolean(name),
    queryFn: () =>
      lambdaGet<GetFunctionResponse>(
        `/2015-03-31/functions/${encodeURIComponent(name)}`,
      ),
  })
}
