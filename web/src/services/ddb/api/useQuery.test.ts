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
import { useDdbQuery } from './useQuery'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

describe('ddb/api/useQuery', () => {
  test('sends KeyConditionExpression with pk value', async () => {
    const captured: { body: any } = { body: null }
    mswServer.use(
      http.post('*/', async ({ request }) => {
        const target = request.headers.get('x-amz-target') ?? ''
        if (target !== 'DynamoDB_20120810.Query')
          return HttpResponse.json({}, { status: 400 })
        captured.body = await request.json()
        return HttpResponse.json(DDB_FIXTURES.queryResult, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        })
      }),
    )
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(
      () => useDdbQuery('orders', 'pk', 'c-1', null),
      { wrapper: Wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captured.body.KeyConditionExpression).toBe('#pk = :pk')
    expect(captured.body.ExpressionAttributeNames).toEqual({ '#pk': 'pk' })
    expect(captured.body.ExpressionAttributeValues).toEqual({
      ':pk': { S: 'c-1' },
    })
  })

  test('base-table only — no IndexName (CONTEXT deferred)', async () => {
    const captured: { body: any } = { body: null }
    mswServer.use(
      http.post('*/', async ({ request }) => {
        captured.body = await request.json()
        return HttpResponse.json(DDB_FIXTURES.queryResult, {
          headers: { 'Content-Type': 'application/x-amz-json-1.0' },
        })
      }),
    )
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(
      () => useDdbQuery('orders', 'pk', 'c-1', null),
      { wrapper: Wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect('IndexName' in captured.body).toBe(false)
  })
})
