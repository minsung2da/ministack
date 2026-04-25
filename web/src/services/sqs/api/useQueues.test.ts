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
import { sqsHandlers } from '../__tests__/msw-handlers'
import { SQS_FIXTURES } from '../../../test/fixtures/sqs'
import { useQueues } from './useQueues'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

describe('sqs/api/useQueues', () => {
  test('parses QueueUrls from ListQueues response', async () => {
    mswServer.use(...sqsHandlers)
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useQueues(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(result.current.data.map((d) => d.url)).toEqual(
      SQS_FIXTURES.listQueues.QueueUrls,
    )
  })

  test('fans out GetQueueAttributes in parallel via useQueries (Pitfall 7.2.12)', async () => {
    const attrCalls: string[] = []
    mswServer.use(
      http.post('*/', async ({ request }) => {
        const target = request.headers.get('x-amz-target') ?? ''
        const action = target.slice('AmazonSQS.'.length)
        if (action === 'ListQueues') {
          return HttpResponse.json(SQS_FIXTURES.listQueues, {
            headers: { 'Content-Type': 'application/x-amz-json-1.0' },
          })
        }
        if (action === 'GetQueueAttributes') {
          const body = (await request.json()) as { QueueUrl: string }
          attrCalls.push(body.QueueUrl)
          return HttpResponse.json(SQS_FIXTURES.getQueueAttributes, {
            headers: { 'Content-Type': 'application/x-amz-json-1.0' },
          })
        }
        return HttpResponse.json({}, { status: 400 })
      }),
    )
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useQueues(), { wrapper: Wrapper })
    await waitFor(() => {
      expect(attrCalls).toHaveLength(2)
      expect(result.current.data[0]?.attributes).not.toBeNull()
    })
    expect(new Set(attrCalls)).toEqual(
      new Set(SQS_FIXTURES.listQueues.QueueUrls),
    )
  })
})
