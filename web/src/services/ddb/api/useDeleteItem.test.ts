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
import { useDeleteItem } from './useDeleteItem'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

describe('ddb/api/useDeleteItem', () => {
  test('sends Key map built from PK (+ optional SK)', async () => {
    const captured: { body: any } = { body: null }
    mswServer.use(
      http.post('*/', async ({ request }) => {
        captured.body = await request.json()
        return HttpResponse.json(DDB_FIXTURES.deleteItem, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        })
      }),
    )
    const key = { pk: { S: 'c-1' as const }, sk: { S: '2026-04-01' as const } }
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useDeleteItem('orders'), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({ key })
    })
    expect(captured.body).toEqual({ TableName: 'orders', Key: key })
  })

  test('invalidates exactly once with a table-scoped predicate (Pitfall C-3)', async () => {
    mswServer.use(
      http.post('*/', () =>
        HttpResponse.json(DDB_FIXTURES.deleteItem, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        }),
      ),
    )
    const { client, Wrapper } = makeHookHarness()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteItem('orders'), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({ key: { pk: { S: 'c-1' } } })
    })
    expect(spy).toHaveBeenCalledTimes(1)
    const arg = spy.mock.calls[0][0] as { predicate: (q: any) => boolean }
    expect(
      arg.predicate({ queryKey: ['ddb', 'item', 'orders', '{}'] }),
    ).toBe(true)
    expect(
      arg.predicate({ queryKey: ['ddb', 'scan', 'orders', null, null] }),
    ).toBe(true)
    expect(arg.predicate({ queryKey: ['ddb', 'tables'] })).toBe(false)
  })
})
