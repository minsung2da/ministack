/**
 * SQS message store (D-04) — Zustand slice keyed by queueUrl.
 *
 * Lives OUTSIDE the TanStack Query cache on purpose:
 *   - ReceiveMessage is user-triggered (manual poll button) and accumulates
 *     into a running list per D-04. Cache semantics (stale-while-revalidate,
 *     garbage collection) don't fit that model.
 *   - Messages also carry ReceiptHandles that must stay addressable by the
 *     Delete / Purge UI regardless of whether the list view is mounted.
 *
 * All state transitions use spreads (immutable, per global coding-style rule).
 *
 * Dedupe strategy on `append`: keep the FIRST occurrence's ReceiptHandle if
 * the same MessageId arrives twice (visibility-timeout churn). That keeps the
 * handle the user already saw actionable; a later receive with a different
 * handle would invalidate the in-flight Delete action otherwise.
 */

import { create } from 'zustand'
import type { SqsMessage } from '../../../shared/types/sqs'

type State = {
  byQueue: Record<string, SqsMessage[]>
  append: (url: string, msgs: SqsMessage[]) => void
  remove: (url: string, receiptHandle: string) => void
  clear: (url: string) => void
  get: (url: string) => SqsMessage[]
}

export const useSqsMessageStore = create<State>((set, getState) => ({
  byQueue: {},
  append: (url, msgs) =>
    set((s) => {
      const existing = s.byQueue[url] ?? []
      const existingIds = new Set(existing.map((m) => m.MessageId))
      // D-04: accumulating list with MessageId-based dedupe.
      const additions = msgs.filter((m) => !existingIds.has(m.MessageId))
      if (additions.length === 0) return s
      return {
        byQueue: { ...s.byQueue, [url]: [...existing, ...additions] },
      }
    }),
  remove: (url, receiptHandle) =>
    set((s) => ({
      byQueue: {
        ...s.byQueue,
        [url]: (s.byQueue[url] ?? []).filter(
          (m) => m.ReceiptHandle !== receiptHandle,
        ),
      },
    })),
  clear: (url) =>
    set((s) => ({ byQueue: { ...s.byQueue, [url]: [] } })),
  get: (url) => getState().byQueue[url] ?? [],
}))
