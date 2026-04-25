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
import { DDB_FIXTURES } from '../../../test/fixtures/ddb'
import { useItem } from './useItem'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

describe('ddb/api/useItem', () => {
  test('sends GetItem with Key map built from AttributeValues', async () => {
    const captured: { body: any } = { body: null }
    mswServer.use(
      http.post('*/', async ({ request }) => {
        captured.body = await request.json()
        return HttpResponse.json(DDB_FIXTURES.getItem, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        })
      }),
    )
    const key = { pk: { S: 'c-1' as const }, sk: { S: '2026-04-01' as const } }
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useItem('orders', key), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captured.body.Key).toEqual(key)
    expect(result.current.data).toEqual(DDB_FIXTURES.getItem.Item)
  })

  test('missing item returns undefined (no Item key in response — §1.7)', async () => {
    mswServer.use(
      http.post('*/', () =>
        HttpResponse.json(
          {},
          { headers: { 'Content-Type': 'application/x-amz-json-1.0' } },
        ),
      ),
    )
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(
      () => useItem('orders', { pk: { S: 'missing' } }),
      { wrapper: Wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // §1.7: missing Item — normalized to null (TanStack rejects undefined).
    expect(result.current.data).toBeNull()
  })
})
