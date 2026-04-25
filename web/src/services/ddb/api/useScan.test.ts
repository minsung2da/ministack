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
import { useScan } from './useScan'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function scanCapture() {
  const captured: { body: any } = { body: null }
  mswServer.use(
    http.post('*/', async ({ request }) => {
      const target = request.headers.get('x-amz-target') ?? ''
      if (target !== 'DynamoDB_20120810.Scan')
        return HttpResponse.json({}, { status: 400 })
      captured.body = await request.json()
      return HttpResponse.json(DDB_FIXTURES.scanMixed, {
        headers: { 'Content-Type': 'application/x-amz-json-1.0' },
      })
    }),
  )
  return captured
}

describe('ddb/api/useScan', () => {
  test('sends Scan with TableName and optional FilterExpression', async () => {
    const captured = scanCapture()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(
      () => useScan('orders', 'paid = :p', null),
      { wrapper: Wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captured.body.TableName).toBe('orders')
    expect(captured.body.FilterExpression).toBe('paid = :p')
    expect('ExclusiveStartKey' in captured.body).toBe(false)
  })

  test('LastEvaluatedKey round-trip — map (not string) for body, stringified for key (Pitfall 7.2.2)', async () => {
    const captured = scanCapture()
    const eskMap = { pk: { S: 'c-2' }, sk: { S: '2026-04-01' } }
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useScan('orders', null, eskMap), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Pitfall 7.2.2: ExclusiveStartKey is a MAP on the wire.
    expect(captured.body.ExclusiveStartKey).toEqual(eskMap)
    expect(typeof captured.body.ExclusiveStartKey).toBe('object')
  })

  test('mixed-type items (S,N,BOOL,NULL) parse without loss', async () => {
    scanCapture()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useScan('orders', null, null), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.Items).toEqual(DDB_FIXTURES.scanMixed.Items)
  })
})
