import { useQuery, useQueries } from '@tanstack/react-query'
import { sqsJsonCall } from './sqsClient'
import { sqsKeys } from './sqsKeys'
import { parseSqsAttributes } from './parseSqsAttributes'
import type {
  SqsQueueAttributes,
  SqsRawAttributes,
} from '../../../shared/types/sqs'

/**
 * useQueues — ListQueues + fan-out GetQueueAttributes.
 *
 * Pitfall 7.2.12: the per-queue attribute fetches MUST run in parallel
 * (`useQueries`), not serially. The queues list could be 10+ entries and
 * serial fetching introduces multi-second latency for no benefit.
 *
 * Each attribute fetch caches under `sqsKeys.attributes(url)` so a later
 * detail-page navigation reuses the data.
 */
export type QueueWithAttributes = {
  url: string
  attributes: SqsQueueAttributes | null
}

export function useQueues(prefix?: string) {
  const listQ = useQuery({
    queryKey: sqsKeys.queues(prefix),
    queryFn: async () => {
      const res = await sqsJsonCall<{ QueueUrls?: string[] }>(
        'ListQueues',
        prefix ? { QueueNamePrefix: prefix } : {},
      )
      return res.QueueUrls ?? []
    },
  })
  const urls = listQ.data ?? []
  // Pitfall 7.2.12 — parallel, not serial.
  const attrQueries = useQueries({
    queries: urls.map((url) => ({
      queryKey: sqsKeys.attributes(url),
      queryFn: async () => {
        const res = await sqsJsonCall<{ Attributes?: SqsRawAttributes }>(
          'GetQueueAttributes',
          { QueueUrl: url, AttributeNames: ['All'] },
        )
        return parseSqsAttributes(res.Attributes ?? {})
      },
    })),
  })
  return {
    isLoading:
      listQ.isLoading || attrQueries.some((q) => q.isLoading),
    error:
      listQ.error ?? attrQueries.find((q) => q.error)?.error ?? null,
    data: urls.map<QueueWithAttributes>((url, i) => ({
      url,
      attributes: attrQueries[i]?.data ?? null,
    })),
    refetch: listQ.refetch,
  }
}
