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
import { usePurgeQueue } from './usePurgeQueue'
import { useSqsMessageStore } from '../store/messageStore'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

const URL_A = 'http://localhost:4566/000000000000/dev-orders'

beforeEach(() => {
  useSqsMessageStore.setState({ byQueue: {} })
})

describe('sqs/api/usePurgeQueue', () => {
  test('sends PurgeQueue with QueueUrl', async () => {
    const captured: { body: any } = { body: null }
    mswServer.use(
      http.post('*/', async ({ request }) => {
        captured.body = await request.json()
        return HttpResponse.json(SQS_FIXTURES.purgeQueue, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        })
      }),
    )
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => usePurgeQueue(URL_A), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync()
    })
    expect(captured.body).toEqual({ QueueUrl: URL_A })
  })

  test('clears Zustand messageStore[url] and invalidates attributes exactly once (Pitfall C-3)', async () => {
    mswServer.use(
      http.post('*/', () =>
        HttpResponse.json(SQS_FIXTURES.purgeQueue, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        }),
      ),
    )
    useSqsMessageStore.getState().append(URL_A, [
      {
        MessageId: 'm1',
        ReceiptHandle: 'r1',
        MD5OfBody: '',
        Body: 'x',
      },
    ])
    const { client, Wrapper } = makeHookHarness()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => usePurgeQueue(URL_A), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync()
    })
    expect(useSqsMessageStore.getState().get(URL_A)).toEqual([])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['sqs', 'attributes', URL_A],
    })
  })
})
