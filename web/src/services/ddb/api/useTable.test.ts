import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { mswServer } from '../../../test/msw'
import { makeHookHarness } from '../../../test/hookWrapper'
import { ddbHandlers } from '../__tests__/msw-handlers'
import { DDB_FIXTURES } from '../../../test/fixtures/ddb'
import { useTable } from './useTable'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

describe('ddb/api/useTable', () => {
  test('parses DescribeTable into KeySchema / AttributeDefinitions / BillingMode', async () => {
    mswServer.use(...ddbHandlers)
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useTable('orders'), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.KeySchema).toEqual(
      DDB_FIXTURES.describeTableOrders.Table.KeySchema,
    )
    expect(result.current.data?.AttributeDefinitions).toEqual(
      DDB_FIXTURES.describeTableOrders.Table.AttributeDefinitions,
    )
    expect(result.current.data?.BillingModeSummary?.BillingMode).toBe(
      'PAY_PER_REQUEST',
    )
  })

  test('exposes hashKey and optional sortKey derived from KeySchema', async () => {
    mswServer.use(...ddbHandlers)
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useTable('orders'), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.hashKey).toBe('pk')
    expect(result.current.data?.sortKey).toBe('sk')
  })
})
