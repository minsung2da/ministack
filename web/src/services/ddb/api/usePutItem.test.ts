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
import { DDB_FIXTURES } from '../../../test/fixtures/ddb'
import { usePutItem } from './usePutItem'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function capturePutBody() {
  const captured: { body: any } = { body: null }
  mswServer.use(
    http.post('*/', async ({ request }) => {
      captured.body = await request.json()
      return HttpResponse.json(DDB_FIXTURES.putItemNone, {
        headers: { 'Content-Type': 'application/x-amz-json-1.0' },
      })
    }),
  )
  return captured
}

describe('ddb/api/usePutItem', () => {
  test('marshals Item from native values to AttributeValue map (D-06 + Pitfall 7.2.1)', async () => {
    const captured = capturePutBody()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => usePutItem('orders'), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({
        pk: { type: 'S', value: 'abc' },
        total: { type: 'N', value: 42 },
        paid: { type: 'BOOL', value: true },
      })
    })
    expect(captured.body.TableName).toBe('orders')
    // Pitfall 7.2.1: N is always a STRING on the wire — not `42` as number.
    expect(captured.body.Item).toEqual({
      pk: { S: 'abc' },
      total: { N: '42' },
      paid: { BOOL: true },
    })
  })

  test('invalidates exactly once with a table-scoped predicate (Pitfall C-3)', async () => {
    capturePutBody()
    const { client, Wrapper } = makeHookHarness()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => usePutItem('orders'), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({
        pk: { type: 'S', value: 'abc' },
      })
    })
    expect(spy).toHaveBeenCalledTimes(1)
    // Predicate-based invalidation (object with `predicate` function).
    const arg = spy.mock.calls[0][0] as { predicate: (q: any) => boolean }
    expect(typeof arg.predicate).toBe('function')
    expect(
      arg.predicate({ queryKey: ['ddb', 'scan', 'orders', null, null] }),
    ).toBe(true)
    expect(
      arg.predicate({ queryKey: ['ddb', 'scan', 'other-table', null, null] }),
    ).toBe(false)
    expect(arg.predicate({ queryKey: ['ddb', 'tables'] })).toBe(false)
  })
})
