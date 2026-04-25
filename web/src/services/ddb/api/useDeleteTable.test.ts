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
import { useDeleteTable } from './useDeleteTable'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

describe('ddb/api/useDeleteTable', () => {
  test('sends DeleteTable with TableName', async () => {
    const captured: { body: any } = { body: null }
    mswServer.use(
      http.post('*/', async ({ request }) => {
        captured.body = await request.json()
        return HttpResponse.json(DDB_FIXTURES.deleteTableResponse, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        })
      }),
    )
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useDeleteTable(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync('orders')
    })
    expect(captured.body).toEqual({ TableName: 'orders' })
  })

  test('invalidates ddbKeys.tables() exactly once (Pitfall C-3)', async () => {
    mswServer.use(
      http.post('*/', () =>
        HttpResponse.json(DDB_FIXTURES.deleteTableResponse, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        }),
      ),
    )
    const { client, Wrapper } = makeHookHarness()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteTable(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync('orders')
    })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({ queryKey: ['ddb', 'tables'] })
  })
})
