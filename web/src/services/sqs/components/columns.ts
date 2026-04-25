import type { TableProps } from '@cloudscape-design/components/table'
import { Link } from 'react-router-dom'
import { createElement } from 'react'
import type { SqsMessage } from '../../../shared/types/sqs'

export type QueueRow = {
  queueUrl: string
  queueName: string
  available: number
  inFlight: number
}

export const QUEUE_COLUMNS: TableProps.ColumnDefinition<QueueRow>[] = [
  {
    id: 'name',
    header: 'Name',
    sortingField: 'queueName',
    minWidth: 240,
    cell: (r) =>
      createElement(
        Link,
        { to: `/services/sqs/${encodeURIComponent(r.queueName)}` },
        r.queueName,
      ),
  },
  {
    id: 'available',
    header: 'Messages available',
    sortingField: 'available',
    cell: (r) => r.available,
  },
  {
    id: 'inFlight',
    header: 'Messages in flight',
    sortingField: 'inFlight',
    cell: (r) => r.inFlight,
  },
]

export const QUEUE_VISIBLE_CONTENT = ['name', 'available', 'inFlight']

function truncate(s: string, n = 40): string {
  if (!s) return ''
  return s.length > n ? `${s.slice(0, n)}…` : s
}

export const MESSAGE_COLUMNS = (
  onDelete: (receiptHandle: string) => void,
): TableProps.ColumnDefinition<SqsMessage>[] => [
  {
    id: 'messageId',
    header: 'Message ID',
    cell: (m) => truncate(m.MessageId, 20),
  },
  {
    id: 'body',
    header: 'Body',
    cell: (m) => truncate(m.Body ?? '', 60),
  },
  {
    id: 'attrs',
    header: 'Attributes',
    cell: (m) =>
      m.MessageAttributes
        ? String(Object.keys(m.MessageAttributes).length)
        : '0',
  },
  {
    id: 'received',
    header: 'Received',
    cell: (m) =>
      m.ReceivedAt ? m.ReceivedAt.toLocaleTimeString() : '—',
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: (m) =>
      createElement(
        'button',
        {
          type: 'button',
          onClick: () => onDelete(m.ReceiptHandle),
          style: {
            background: 'none',
            border: 'none',
            color: '#0972d3',
            cursor: 'pointer',
            padding: 0,
          },
          'aria-label': `Delete message ${m.MessageId}`,
        },
        'Delete',
      ),
  },
]
