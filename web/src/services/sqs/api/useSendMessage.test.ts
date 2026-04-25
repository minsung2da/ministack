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
import { useSendMessage } from './useSendMessage'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

const URL_A = 'http://localhost:4566/000000000000/dev-orders'

function stubSend() {
  const captured: { body: any; raw: string } = { body: null, raw: '' }
  mswServer.use(
    http.post('*/', async ({ request }) => {
      captured.raw = await request.clone().text()
      captured.body = JSON.parse(captured.raw)
      return HttpResponse.json(SQS_FIXTURES.sendMessage, {
        headers: { 'Content-Type': 'application/x-amz-json-1.0' },
      })
    }),
  )
  return captured
}

describe('sqs/api/useSendMessage', () => {
  test('sends QueueUrl + MessageBody as plain JSON object (D-10)', async () => {
    const captured = stubSend()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useSendMessage(URL_A), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({ MessageBody: 'hello' })
    })
    expect(captured.body.QueueUrl).toBe(URL_A)
    expect(captured.body.MessageBody).toBe('hello')
    // D-10: body is JSON — not URL-encoded.
    expect(captured.raw).not.toContain('MessageBody=')
  })

  test('MessageAttributes stays nested (NOT flattened to MessageAttribute.1.Name — Pitfall 7.2.3)', async () => {
    const captured = stubSend()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useSendMessage(URL_A), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({
        MessageBody: 'hi',
        MessageAttributes: {
          'trace-id': { DataType: 'String', StringValue: 'abc' },
        },
      })
    })
    expect(captured.body.MessageAttributes).toEqual({
      'trace-id': { DataType: 'String', StringValue: 'abc' },
    })
    expect(captured.raw).not.toMatch(/MessageAttribute\.1\.Name/)
  })

  test('invalidates sqsKeys.attributes(url) exactly once (Pitfall C-3)', async () => {
    stubSend()
    const { client, Wrapper } = makeHookHarness()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useSendMessage(URL_A), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({ MessageBody: 'x' })
    })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['sqs', 'attributes', URL_A],
    })
  })
})
