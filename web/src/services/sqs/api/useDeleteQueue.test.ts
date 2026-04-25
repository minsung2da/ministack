import {
  describe,
  test,
  expect,
  vi,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { makeHookHarness } from '../../../test/hookWrapper'
import { SQS_FIXTURES } from '../../../test/fixtures/sqs'
import { useDeleteQueue } from './useDeleteQueue'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

const URL_A = 'http://localhost:4566/000000000000/dev-orders'

describe('sqs/api/useDeleteQueue', () => {
  test('sends QueueUrl in JSON body', async () => {
    const captured: { body: any } = { body: null }
    mswServer.use(
      http.post('*/', async ({ request }) => {
        captured.body = await request.json()
        return HttpResponse.json(SQS_FIXTURES.deleteQueue, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        })
      }),
    )
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useDeleteQueue(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync(URL_A)
    })
    expect(captured.body).toEqual({ QueueUrl: URL_A })
  })

  test('invalidates sqsKeys.queues() exactly once (Pitfall C-3)', async () => {
    mswServer.use(
      http.post('*/', () =>
        HttpResponse.json(SQS_FIXTURES.deleteQueue, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        }),
      ),
    )
    const { client, Wrapper } = makeHookHarness()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteQueue(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync(URL_A)
    })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({ queryKey: ['sqs', 'queues'] })
  })
})
