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
import { useCreateQueue } from './useCreateQueue'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function stubCreate() {
  const captured: { body: any } = { body: null }
  mswServer.use(
    http.post('*/', async ({ request }) => {
      captured.body = await request.json()
      return HttpResponse.json(SQS_FIXTURES.createQueue, {
        headers: { 'Content-Type': 'application/x-amz-json-1.0' },
      })
    }),
  )
  return captured
}

describe('sqs/api/useCreateQueue', () => {
  test('sends QueueName + optional Attributes map', async () => {
    const captured = stubCreate()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useCreateQueue(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        QueueName: 'dev-new',
        Attributes: { VisibilityTimeout: '60' },
      })
    })
    expect(captured.body).toEqual({
      QueueName: 'dev-new',
      Attributes: { VisibilityTimeout: '60' },
    })
  })

  test('invalidates sqsKeys.queues() exactly once (Pitfall C-3)', async () => {
    stubCreate()
    const { client, Wrapper } = makeHookHarness()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateQueue(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ QueueName: 'dev-new' })
    })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({ queryKey: ['sqs', 'queues'] })
  })
})
