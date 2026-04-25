/**
 * MessagesTab — D-04 append semantics smoke test.
 *
 * Verifies the append-not-replace invariant by directly driving the
 * Zustand store: calling `append()` twice with different messages results
 * in cumulative (not replacement) messages — Pitfall 7.2.3.
 *
 * Full RTL coverage is deferred; the store contract tested here is the
 * D-04 correctness gate the UI consumes.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useSqsMessageStore } from '../store/messageStore'
import type { SqsMessage } from '../../../shared/types/sqs'

function msg(id: string, rh: string): SqsMessage {
  return {
    MessageId: id,
    ReceiptHandle: rh,
    MD5OfBody: 'x',
    Body: 'body-' + id,
  }
}

describe('sqs/MessagesTab (D-04 append semantics — store contract)', () => {
  beforeEach(() => {
    useSqsMessageStore.setState({ byQueue: {} })
  })

  it('polling twice produces cumulative rows, not replacement (append — D-04)', () => {
    const url = 'http://sqs/q1'
    useSqsMessageStore.getState().append(url, [msg('m1', 'rh1')])
    expect(useSqsMessageStore.getState().byQueue[url]).toHaveLength(1)

    // Second poll — append (NOT replace).
    useSqsMessageStore.getState().append(url, [msg('m2', 'rh2')])
    expect(useSqsMessageStore.getState().byQueue[url]).toHaveLength(2)
  })

  it('remove takes only the target ReceiptHandle, leaving others intact', () => {
    const url = 'http://sqs/q1'
    useSqsMessageStore
      .getState()
      .append(url, [msg('m1', 'rh1'), msg('m2', 'rh2')])
    useSqsMessageStore.getState().remove(url, 'rh1')
    const left = useSqsMessageStore.getState().byQueue[url] ?? []
    expect(left).toHaveLength(1)
    expect(left[0]?.MessageId).toBe('m2')
  })
})
