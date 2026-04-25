import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sqsJsonCall } from './sqsClient'
import { sqsKeys } from './sqsKeys'
import { useSqsMessageStore } from '../store/messageStore'

/**
 * usePurgeQueue — PurgeQueue.
 *
 * On success: clear the store slot for this URL (the queue just lost every
 * message) and run a SINGLE invalidate on the attributes key. Pitfall C-3
 * accounting: store mutations don't count as invalidateQueries calls.
 *
 * Note: MiniStack has no 60s cooldown (real AWS does). Client-side lockout
 * is deferred to the copy catalog; backend enforcement is the source of
 * truth for error cases.
 */
export function usePurgeQueue(url: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => sqsJsonCall('PurgeQueue', { QueueUrl: url }),
    onSuccess: () => {
      useSqsMessageStore.getState().clear(url)
      void qc.invalidateQueries({ queryKey: sqsKeys.attributes(url) })
    },
  })
}
