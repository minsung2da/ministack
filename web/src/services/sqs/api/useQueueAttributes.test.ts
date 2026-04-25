import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { makeHookHarness } from '../../../test/hookWrapper'
import { SQS_FIXTURES } from '../../../test/fixtures/sqs'
import { useQueueAttributes } from './useQueueAttributes'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

const URL_A = 'http://localhost:4566/000000000000/dev-orders'

describe('sqs/api/useQueueAttributes', () => {
  test('requests AttributeNames: [All]', async () => {
    const captured: { body: any } = { body: null }
    mswServer.use(
      http.post('*/', async ({ request }) => {
        captured.body = await request.json()
        return HttpResponse.json(SQS_FIXTURES.getQueueAttributes, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        })
      }),
    )
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useQueueAttributes(URL_A), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captured.body.QueueUrl).toBe(URL_A)
    expect(captured.body.AttributeNames).toEqual(['All'])
  })

  test('returns parsed counts as numbers', async () => {
    mswServer.use(
      http.post('*/', () =>
        HttpResponse.json(SQS_FIXTURES.getQueueAttributes, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        }),
      ),
    )
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useQueueAttributes(URL_A), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.ApproximateNumberOfMessages).toBe(5)
    expect(result.current.data?.VisibilityTimeout).toBe(30)
    // Date coercion.
    expect(result.current.data?.CreatedTimestamp).toBeInstanceOf(Date)
  })
})
