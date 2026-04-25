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
import { useCreateTable } from './useCreateTable'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function captureCreateBody() {
  const captured: { body: any } = { body: null }
  mswServer.use(
    http.post('*/', async ({ request }) => {
      captured.body = await request.json()
      return HttpResponse.json(DDB_FIXTURES.createTableResponse, {
        headers: { 'Content-Type': 'application/x-amz-json-1.0' },
      })
    }),
  )
  return captured
}

describe('ddb/api/useCreateTable', () => {
  test('supports hash-only KeySchema', async () => {
    const captured = captureCreateBody()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useCreateTable(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        TableName: 'users',
        hashKey: { name: 'id', type: 'S' },
      })
    })
    expect(captured.body.KeySchema).toHaveLength(1)
    expect(captured.body.AttributeDefinitions).toHaveLength(1)
    expect(captured.body.KeySchema[0]).toEqual({
      AttributeName: 'id',
      KeyType: 'HASH',
    })
  })

  test('supports hash+range KeySchema', async () => {
    const captured = captureCreateBody()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useCreateTable(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        TableName: 'orders',
        hashKey: { name: 'pk', type: 'S' },
        sortKey: { name: 'sk', type: 'S' },
      })
    })
    expect(captured.body.KeySchema).toHaveLength(2)
    expect(captured.body.AttributeDefinitions).toHaveLength(2)
    expect(captured.body.KeySchema[1]).toEqual({
      AttributeName: 'sk',
      KeyType: 'RANGE',
    })
  })

  test('BillingMode defaults to PAY_PER_REQUEST (no ProvisionedThroughput)', async () => {
    const captured = captureCreateBody()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useCreateTable(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        TableName: 'orders',
        hashKey: { name: 'pk', type: 'S' },
      })
    })
    expect(captured.body.BillingMode).toBe('PAY_PER_REQUEST')
    expect('ProvisionedThroughput' in captured.body).toBe(false)
  })

  test('Provisioned billing includes ProvisionedThroughput with defaults {5,5}', async () => {
    const captured = captureCreateBody()
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useCreateTable(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        TableName: 'orders',
        hashKey: { name: 'pk', type: 'S' },
        billingMode: 'PROVISIONED',
      })
    })
    expect(captured.body.ProvisionedThroughput).toEqual({
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    })
  })

  test('invalidates ddbKeys.tables() on success (Pitfall C-3 — exactly once)', async () => {
    captureCreateBody()
    const { client, Wrapper } = makeHookHarness()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateTable(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        TableName: 'orders',
        hashKey: { name: 'pk', type: 'S' },
      })
    })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({ queryKey: ['ddb', 'tables'] })
  })
})
