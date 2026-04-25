import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { LAMBDA_FIXTURES } from '../__tests__/fixtures'
import { useEventSourceMappings } from './useEventSourceMappings'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useEventSourceMappings [LAM-03 / Pitfall 7]', () => {
  test('sends FunctionName query param (not Function — Pitfall 7)', async () => {
    let capturedUrl = ''
    mswServer.use(
      http.get('*/2015-03-31/event-source-mappings', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(LAMBDA_FIXTURES.esmsOne)
      }),
    )
    const { result } = renderHook(() => useEventSourceMappings('hello'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = new URL(capturedUrl)
    expect(url.searchParams.get('FunctionName')).toBe('hello')
    // Pitfall 7: must NOT use 'Function' as the key
    expect(url.searchParams.get('Function')).toBeNull()
  })

  test('returns ESMs with UUID, State, BatchSize', async () => {
    mswServer.use(
      http.get('*/2015-03-31/event-source-mappings', () =>
        HttpResponse.json(LAMBDA_FIXTURES.esmsOne),
      ),
    )
    const { result } = renderHook(() => useEventSourceMappings('hello'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const esm = result.current.data?.EventSourceMappings[0]
    expect(esm?.UUID).toBe('11111111-2222-3333-4444-555555555555')
    expect(esm?.State).toBe('Enabled')
    expect(esm?.BatchSize).toBe(10)
    expect(esm?.EventSourceArn).toContain('sqs')
  })

  test('disables query when functionName is empty', () => {
    const { result } = renderHook(() => useEventSourceMappings(''), {
      wrapper: makeWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
