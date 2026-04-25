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
import { ddbHandlers } from '../__tests__/msw-handlers'
import { DDB_FIXTURES } from '../../../test/fixtures/ddb'
import { useTables } from './useTables'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

describe('ddb/api/useTables', () => {
  test('parses TableNames array from ListTables response', async () => {
    mswServer.use(...ddbHandlers)
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useTables(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.TableNames).toEqual(
      DDB_FIXTURES.listTables.TableNames,
    )
  })

  test('returns empty list when TableNames is undefined', async () => {
    mswServer.use(
      http.post('*/', ({ request }) => {
        const target = request.headers.get('x-amz-target') ?? ''
        if (target === 'DynamoDB_20120810.ListTables') {
          return HttpResponse.json(
            {},
            { headers: { 'Content-Type': 'application/x-amz-json-1.0' } },
          )
        }
        return HttpResponse.json({}, { status: 400 })
      }),
    )
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useTables(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ TableNames: [] })
  })
})
