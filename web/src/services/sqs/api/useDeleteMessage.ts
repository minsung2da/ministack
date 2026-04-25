import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sqsJsonCall } from './sqsClient'
import { sqsKeys } from './sqsKeys'
import { useSqsMessageStore } from '../store/messageStore'

/**
 * useDeleteMessage — DeleteMessage.
 *
 * Pitfall 7.2.4: ReceiptHandle is passed in the JSON body verbatim (no
 * URL encoding) because D-10 puts us on AWS-JSON. The `encodeURIComponent`
 * regression lock grep confirms no caller encodes this field.
 *
 * onSuccess runs TWO side-effects but only ONE invalidateQueries — store
 * mutation is not cache invalidation for Pitfall C-3 accounting.
 */
export type DeleteMessageInput = {
  receiptHandle: string
}

export function useDeleteMessage(url: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ receiptHandle }: DeleteMessageInput) =>
      // Pitfall 7.2.4: raw handle in JSON body — no encoding.
      sqsJsonCall('DeleteMessage', {
        QueueUrl: url,
        ReceiptHandle: receiptHandle,
      }),
    onSuccess: (_result, { receiptHandle }) => {
      useSqsMessageStore.getState().remove(url, receiptHandle)
      void qc.invalidateQueries({ queryKey: sqsKeys.attributes(url) })
    },
  })
}
