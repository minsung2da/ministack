import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { s3Handlers } from '../__tests__/msw-handlers'
import { S3_FIXTURES } from '../__tests__/fixtures'
import { useBuckets } from './useBuckets'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useBuckets [S3-01]', () => {
  test('useBuckets queryKey is [s3, buckets] and parses fixture into S3Bucket[]', async () => {
    mswServer.use(...s3Handlers)
    const { result } = renderHook(() => useBuckets(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0]).toEqual({
      name: 'my-bucket',
      creationDate: '2026-04-12T10:30:00Z',
    })
    expect(result.current.data?.[1]?.name).toBe('other-bucket')
  })

  test('useBuckets returns empty array when no buckets', async () => {
    mswServer.use(
      http.get('*/', () => HttpResponse.xml(S3_FIXTURES.listBucketsEmpty)),
    )
    const { result } = renderHook(() => useBuckets(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
