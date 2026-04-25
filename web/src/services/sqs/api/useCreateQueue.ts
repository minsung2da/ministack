import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sqsJsonCall } from './sqsClient'

/**
 * useCreateQueue — CreateQueue.
 *
 * Pitfall C-3: exactly one invalidateQueries call, scoped to the queues list.
 * The queue's attributes are freshly fetched when the user navigates into
 * the newly-created queue — no need to pre-invalidate them.
 */
export type CreateQueueInput = {
  QueueName: string
  Attributes?: Record<string, string>
}

export function useCreateQueue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateQueueInput) =>
      sqsJsonCall<{ QueueUrl: string }>('CreateQueue', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sqs', 'queues'] })
    },
  })
}
