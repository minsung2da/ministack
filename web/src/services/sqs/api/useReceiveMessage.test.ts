import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { makeHookHarness } from '../../../test/hookWrapper'
import { SQS_FIXTURES } from '../../../test/fixtures/sqs'
import { useReceiveMessage } from './useReceiveMessage'
import { useSqsMessageStore } from '../store/messageStore'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

const URL_A = 'http://localhost:4566/000000000000/dev-orders'

beforeEach(() => {
  useSqsMessageStore.setState({ byQueue: {} })
})

function stubReceive(
  payload: Record<string, unknown> = SQS_FIXTURES.receiveMessagesOne as unknown as Record<
    string,
    unknown
  >,
) {
  const captured: { body: any } = { body: null }
  mswServer.use(
    http.post('*/', async ({ request }) => {
      captured.body = await request.json()
      return HttpResponse.json(payload, {
        headers: { 'Content-Type': 'application/x-amz-json-1.0' },
      })
    }),
  )
  return captured
}

describe('sqs/api/useReceiveMessage', () => {
  test('sends WaitTimeSeconds: 0 and MaxNumberOfMessages: 10 by default (D-04)', async () => {
    const captured = stubReceive()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useReceiveMessage(URL_A), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync()
    })
    expect(captured.body.WaitTimeSeconds).toBe(0)
    expect(captured.body.MaxNumberOfMessages).toBe(10)
  })

  test('empty response ({} — no Messages key) returns [] and does not touch the store (§2.6)', async () => {
    stubReceive(SQS_FIXTURES.receiveMessagesEmpty)
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useReceiveMessage(URL_A), {
      wrapper: Wrapper,
    })
    let received: unknown[] = []
    await act(async () => {
      received = (await result.current.mutateAsync()) as unknown[]
    })
    expect(received).toEqual([])
    expect(useSqsMessageStore.getState().get(URL_A)).toEqual([])
  })

  test('non-empty poll appends each message with ReceivedAt set (D-04)', async () => {
    stubReceive()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useReceiveMessage(URL_A), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync()
    })
    const stored = useSqsMessageStore.getState().get(URL_A)
    expect(stored).toHaveLength(1)
    expect(stored[0].MessageId).toBe(
      SQS_FIXTURES.receiveMessagesOne.Messages[0].MessageId,
    )
    expect(stored[0].ReceivedAt).toBeInstanceOf(Date)
  })

  test('successive polls APPEND to Zustand messageStore (D-04) — dedupe by MessageId', async () => {
    stubReceive()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useReceiveMessage(URL_A), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync()
    })
    await act(async () => {
      await result.current.mutateAsync()
    })
    // Same MessageId returned twice — dedupe keeps length at 1.
    expect(useSqsMessageStore.getState().get(URL_A)).toHaveLength(1)
  })
})
