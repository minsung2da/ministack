import { describe, test, expect, beforeEach } from 'vitest'
import { useSqsMessageStore } from './messageStore'
import type { SqsMessage } from '../../../shared/types/sqs'

function msg(id: string, receipt = `r-${id}`): SqsMessage {
  return {
    MessageId: id,
    ReceiptHandle: receipt,
    MD5OfBody: '',
    Body: `body-${id}`,
  }
}

const QUEUE_A = 'http://localhost:4566/000000000000/a'
const QUEUE_B = 'http://localhost:4566/000000000000/b'

describe('sqs/store/messageStore', () => {
  beforeEach(() => {
    // Reset to empty state between tests.
    useSqsMessageStore.setState({ byQueue: {} })
  })

  test('append adds messages and get returns them', () => {
    useSqsMessageStore.getState().append(QUEUE_A, [msg('m1'), msg('m2')])
    expect(useSqsMessageStore.getState().get(QUEUE_A)).toHaveLength(2)
  })

  test('append dedupes by MessageId across successive polls (D-04)', () => {
    const store = useSqsMessageStore.getState()
    store.append(QUEUE_A, [msg('m1')])
    store.append(QUEUE_A, [msg('m1', 'r-m1-B'), msg('m2')])
    const list = useSqsMessageStore.getState().get(QUEUE_A)
    expect(list).toHaveLength(2)
    // First occurrence wins — ReceiptHandle stays actionable for delete.
    expect(list.find((m) => m.MessageId === 'm1')?.ReceiptHandle).toBe('r-m1')
  })

  test('append produces a NEW byQueue reference (immutability)', () => {
    const store = useSqsMessageStore.getState()
    store.append(QUEUE_A, [msg('m1')])
    const ref1 = useSqsMessageStore.getState().byQueue
    store.append(QUEUE_A, [msg('m2')])
    const ref2 = useSqsMessageStore.getState().byQueue
    expect(ref2).not.toBe(ref1)
    expect(ref2[QUEUE_A]).not.toBe(ref1[QUEUE_A])
  })

  test('remove filters by ReceiptHandle', () => {
    const store = useSqsMessageStore.getState()
    store.append(QUEUE_A, [msg('m1'), msg('m2')])
    store.remove(QUEUE_A, 'r-m1')
    const list = useSqsMessageStore.getState().get(QUEUE_A)
    expect(list.map((m) => m.MessageId)).toEqual(['m2'])
  })

  test('clear empties the queue slot but preserves other queues', () => {
    const store = useSqsMessageStore.getState()
    store.append(QUEUE_A, [msg('m1')])
    store.append(QUEUE_B, [msg('mb1')])
    store.clear(QUEUE_A)
    expect(useSqsMessageStore.getState().get(QUEUE_A)).toEqual([])
    expect(useSqsMessageStore.getState().get(QUEUE_B)).toHaveLength(1)
  })

  test('get returns empty array for unknown queue', () => {
    expect(useSqsMessageStore.getState().get('unknown')).toEqual([])
  })
})
