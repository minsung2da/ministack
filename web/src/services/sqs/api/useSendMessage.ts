import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sqsJsonCall } from './sqsClient'
import { sqsKeys } from './sqsKeys'
import type { SqsMessageAttribute } from '../../../shared/types/sqs'

/**
 * useSendMessage — SendMessage.
 *
 * D-10: body is plain JSON. MessageAttributes stays a NESTED object; never
 * flattened to `MessageAttribute.1.Name` — Pitfall 7.2.3 closed by D-10
 * architecturally (sqsClient uses AWS-JSON wire).
 *
 * Pitfall C-3: single invalidate on queue attributes so counts refresh.
 */
export type SendMessageInput = {
  MessageBody: string
  MessageAttributes?: Record<string, SqsMessageAttribute>
  DelaySeconds?: number
}

export function useSendMessage(url: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      sqsJsonCall<{ MessageId: string; MD5OfBody: string }>('SendMessage', {
        QueueUrl: url,
        ...input,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sqsKeys.attributes(url) })
    },
  })
}
