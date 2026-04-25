import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { makeHookHarness } from '../../../test/hookWrapper'
import { DDB_FIXTURES } from '../../../test/fixtures/ddb'
import { useUpdateItem } from './useUpdateItem'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function captureUpdateBody() {
  const captured: { body: any } = { body: null }
  mswServer.use(
    http.post('*/', async ({ request }) => {
      captured.body = await request.json()
      return HttpResponse.json(DDB_FIXTURES.updateItemAllNew, {
        headers: { 'Content-Type': 'application/x-amz-json-1.0' },
      })
    }),
  )
  return captured
}

describe('ddb/api/useUpdateItem', () => {
  test('builds SET-only UpdateExpression (no REMOVE/ADD/DELETE per §1.9)', async () => {
    const captured = captureUpdateBody()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useUpdateItem('orders'), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({
        key: { pk: { S: 'c-1' }, sk: { S: '2026-04-01' } },
        updates: {
          status: { type: 'S', value: 'paid' },
          total: { type: 'N', value: 99 },
        },
      })
    })
    expect(captured.body.UpdateExpression).toContain('SET ')
    expect(captured.body.UpdateExpression).not.toMatch(/REMOVE |ADD |DELETE /)
    expect(captured.body.UpdateExpression).toBe(
      'SET #n_status = :v_status, #n_total = :v_total',
    )
  })

  test('maps ExpressionAttributeNames / Values from dirty fields', async () => {
    const captured = captureUpdateBody()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useUpdateItem('orders'), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({
        key: { pk: { S: 'c-1' } },
        updates: {
          status: { type: 'S', value: 'paid' },
          total: { type: 'N', value: 99 },
        },
      })
    })
    expect(captured.body.ExpressionAttributeNames).toEqual({
      '#n_status': 'status',
      '#n_total': 'total',
    })
    // Pitfall 7.2.1: N is always string on the wire.
    expect(captured.body.ExpressionAttributeValues).toEqual({
      ':v_status': { S: 'paid' },
      ':v_total': { N: '99' },
    })
  })

  test('ReturnValues: ALL_NEW so UI can refresh item inline', async () => {
    const captured = captureUpdateBody()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useUpdateItem('orders'), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({
        key: { pk: { S: 'c-1' } },
        updates: { status: { type: 'S', value: 'paid' } },
      })
    })
    expect(captured.body.ReturnValues).toBe('ALL_NEW')
  })
})
