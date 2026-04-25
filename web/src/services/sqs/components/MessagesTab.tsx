import { useState } from 'react'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Table from '@cloudscape-design/components/table'
import Alert from '@cloudscape-design/components/alert'
import { copy } from '../../../shared/copy'
import { useSqsMessageStore } from '../store/messageStore'
import { useReceiveMessage } from '../api/useReceiveMessage'
import { useDeleteMessage } from '../api/useDeleteMessage'
import { MESSAGE_COLUMNS } from './columns'
import type { SqsMessage } from '../../../shared/types/sqs'

// Stable reference for empty state — prevents Zustand selector
// returning a new [] each render which would trigger infinite re-renders.
const EMPTY_MESSAGES: SqsMessage[] = []

type Props = {
  queueUrl: string
  queueName: string
}

/**
 * MessagesTab — D-04 manual Poll + append-list.
 *
 * - Subscribes to useSqsMessageStore().byQueue[queueUrl] — the accumulating
 *   list of messages received across polls (never replaced).
 * - Each Poll click triggers ONE ReceiveMessage; the hook's onSuccess appends
 *   into the store (D-04). Double-click = cumulative, not replacement.
 * - Per-row Delete calls useDeleteMessage; the hook removes from the store.
 * - "Clear polled" locally clears the store slot without calling DeleteMessage.
 */
export function MessagesTab({ queueUrl }: Props) {
  const messages = useSqsMessageStore(
    (s) => s.byQueue[queueUrl] ?? EMPTY_MESSAGES,
  )
  const receive = useReceiveMessage(queueUrl)
  const del = useDeleteMessage(queueUrl)
  const [lastPolledAt, setLastPolledAt] = useState<number | null>(null)

  const onPoll = () =>
    receive.mutate(undefined, {
      onSuccess: () => setLastPolledAt(Date.now()),
    })

  // D-04: append — calling receive twice accumulates messages, does not replace.
  const onDelete = (receiptHandle: string) =>
    del.mutate({ receiptHandle })

  const onClear = () => useSqsMessageStore.getState().clear(queueUrl)

  return (
    <SpaceBetween size="m">
      <SpaceBetween size="xs" direction="horizontal">
        <Button
          variant="primary"
          onClick={onPoll}
          loading={receive.isPending}
        >
          {copy.sqs.pollButton}
        </Button>
        {lastPolledAt !== null && (
          <Box variant="span" color="text-status-inactive">
            {copy.sqs.lastPolled(new Date(lastPolledAt).toISOString())}
          </Box>
        )}
        {messages.length > 0 && (
          <Button variant="normal" onClick={onClear}>
            {copy.sqs.clearPolled}
          </Button>
        )}
      </SpaceBetween>

      {receive.isError && (
        <Alert type="error" header={copy.sqs.pollErrorHeader}>
          {(receive.error as Error).message}
        </Alert>
      )}

      {messages.length === 0 ? (
        <Box padding="m" variant="p">
          {copy.sqs.messagesEmpty}
        </Box>
      ) : (
        <Table
          items={messages}
          columnDefinitions={MESSAGE_COLUMNS(onDelete)}
          variant="embedded"
          trackBy="ReceiptHandle"
        />
      )}
    </SpaceBetween>
  )
}
