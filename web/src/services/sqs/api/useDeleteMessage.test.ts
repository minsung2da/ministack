import {
  describe,
  test,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { makeHookHarness } from '../../../test/hookWrapper'
import { SQS_FIXTURES } from '../../../test/fixtures/sqs'
import { useDeleteMessage } from './useDeleteMessage'
import { useSqsMessageStore } from '../store/messageStore'
import type { SqsMessage } from '../../../shared/types/sqs'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

const URL_A = 'http://localhost:4566/000000000000/dev-orders'

beforeEach(() => {
  useSqsMessageStore.setState({ byQueue: {} })
})

function seed(receiptHandle: string): SqsMessage {
  const m: SqsMessage = {
    MessageId: 'm1',
    ReceiptHandle: receiptHandle,
    MD5OfBody: '',
    Body: 'b',
  }
  useSqsMessageStore.getState().append(URL_A, [m])
  return m
}

describe('sqs/api/useDeleteMessage', () => {
  test('sends QueueUrl + ReceiptHandle in JSON body (Pitfall 7.2.4 — no URL encoding)', async () => {
    const captured: { body: any; raw: string } = { body: null, raw: '' }
    mswServer.use(
      http.post('*/', async ({ request }) => {
        captured.raw = await request.clone().text()
        captured.body = JSON.parse(captured.raw)
        return HttpResponse.json(SQS_FIXTURES.deleteMessage, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        })
      }),
    )
    // Plus-signs test the raw-handle path even though MiniStack uses UUIDs.
    const receipt = 'raw+handle/with=chars'
    seed(receipt)
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useDeleteMessage(URL_A), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({ receiptHandle: receipt })
    })
    expect(captured.body).toEqual({
      QueueUrl: URL_A,
      ReceiptHandle: receipt,
    })
    // Pitfall 7.2.4: the raw body contains the handle verbatim, not URL-encoded.
    expect(captured.raw).toContain(receipt)
    expect(captured.raw).not.toContain('raw%2Bhandle')
  })

  test('removes the deleted message from Zustand messageStore', async () => {
    mswServer.use(
      http.post('*/', () =>
        HttpResponse.json(SQS_FIXTURES.deleteMessage, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        }),
      ),
    )
    seed('r-m1')
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useDeleteMessage(URL_A), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({ receiptHandle: 'r-m1' })
    })
    expect(useSqsMessageStore.getState().get(URL_A)).toEqual([])
  })

  test('invalidates sqsKeys.attributes(url) exactly once (Pitfall C-3)', async () => {
    mswServer.use(
      http.post('*/', () =>
        HttpResponse.json(SQS_FIXTURES.deleteMessage, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        }),
      ),
    )
    seed('r-m1')
    const { client, Wrapper } = makeHookHarness()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteMessage(URL_A), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({ receiptHandle: 'r-m1' })
    })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['sqs', 'attributes', URL_A],
    })
  })
})
