import { useMutation } from '@tanstack/react-query'
import { sqsJsonCall } from './sqsClient'
import { useSqsMessageStore } from '../store/messageStore'
import type { SqsMessage } from '../../../shared/types/sqs'

/**
 * useReceiveMessage — D-04 manual poll.
 *
 * Deviates from "all SQS state in TanStack cache" on purpose:
 *   - Writes received messages into Zustand messageStore (accumulating list),
 *     NOT the TanStack cache.
 *   - Does NOT invalidate any query keys — polling should not thrash the
 *     Configuration tab on rapid clicks. The Configuration tab's next
 *     natural refetch picks up updated counts.
 *
 * Pitfall §2.6: empty polls return `{}` (no Messages key). `res.Messages ?? []`
 * prevents the crash.
 */
export type ReceiveMessageInput = {
  MaxNumberOfMessages?: number
  WaitTimeSeconds?: number
}

export function useReceiveMessage(url: string) {
  return useMutation<SqsMessage[], Error, ReceiveMessageInput | void>({
    mutationFn: async (input) => {
      const res = await sqsJsonCall<{ Messages?: SqsMessage[] }>(
        'ReceiveMessage',
        {
          QueueUrl: url,
          // D-04: manual poll with no long-poll by default.
          MaxNumberOfMessages: input?.MaxNumberOfMessages ?? 10,
          WaitTimeSeconds: input?.WaitTimeSeconds ?? 0,
          AttributeNames: ['All'],
          MessageAttributeNames: ['All'],
        },
      )
      const now = new Date()
      // §2.6: empty-poll safety.
      return (res.Messages ?? []).map((m) => ({ ...m, ReceivedAt: now }))
    },
    onSuccess: (msgs) => {
      if (msgs.length > 0) useSqsMessageStore.getState().append(url, msgs)
    },
  })
}
