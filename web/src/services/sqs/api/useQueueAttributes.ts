import { useQuery } from '@tanstack/react-query'
import { sqsJsonCall } from './sqsClient'
import { sqsKeys } from './sqsKeys'
import { parseSqsAttributes } from './parseSqsAttributes'
import type {
  SqsQueueAttributes,
  SqsRawAttributes,
} from '../../../shared/types/sqs'

/**
 * useQueueAttributes — GetQueueAttributes + parseSqsAttributes.
 *
 * Requests AttributeNames:['All'] so the Configuration tab can render ANY
 * backend-supplied key (FIFO, KMS, etc.) via the preserved `raw` map even
 * though our typed shape only covers the common set.
 */
export function useQueueAttributes(url: string) {
  return useQuery<SqsQueueAttributes>({
    queryKey: sqsKeys.attributes(url),
    queryFn: async () => {
      const res = await sqsJsonCall<{ Attributes?: SqsRawAttributes }>(
        'GetQueueAttributes',
        { QueueUrl: url, AttributeNames: ['All'] },
      )
      return parseSqsAttributes(res.Attributes ?? {})
    },
    enabled: !!url,
  })
}
