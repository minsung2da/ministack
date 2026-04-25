import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sqsJsonCall } from './sqsClient'

/**
 * useDeleteQueue — DeleteQueue.
 *
 * Pitfall C-3: single invalidate on the queues list. Attributes / messages
 * caches for the deleted URL will eventually garbage-collect — no cascade
 * invalidate required.
 */
export function useDeleteQueue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (QueueUrl: string) =>
      sqsJsonCall('DeleteQueue', { QueueUrl }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sqs', 'queues'] })
    },
  })
}
