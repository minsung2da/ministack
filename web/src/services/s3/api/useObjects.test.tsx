import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { s3Handlers } from '../__tests__/msw-handlers'
import { S3_FIXTURES } from '../__tests__/fixtures'
import { useObjects, objectsQueryKey } from './useObjects'

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

describe('useObjects [S3-02]', () => {
  test('builds ListObjectsV2 query with list-type=2, delimiter=/, prefix, max-keys, continuation-token', async () => {
    let capturedUrl: URL | null = null
    mswServer.use(
      http.get('*/my-bucket', ({ request }) => {
        capturedUrl = new URL(request.url)
        return HttpResponse.xml(S3_FIXTURES.listObjectsNested)
      }),
    )
    const { result } = renderHook(
      () =>
        useObjects({
          bucket: 'my-bucket',
          prefix: 'photos/',
          pageSize: 50,
          continuationToken: 'cont-xyz',
        }),
      { wrapper: makeWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedUrl).not.toBeNull()
    const params = capturedUrl!.searchParams
    expect(params.get('list-type')).toBe('2')
    expect(params.get('delimiter')).toBe('/')
    expect(params.get('max-keys')).toBe('50')
    expect(params.get('prefix')).toBe('photos/')
    expect(params.get('continuation-token')).toBe('cont-xyz')
  })

  test('omits prefix and continuation-token when empty/null', async () => {
    let capturedUrl: URL | null = null
    mswServer.use(
      http.get('*/my-bucket', ({ request }) => {
        capturedUrl = new URL(request.url)
        return HttpResponse.xml(S3_FIXTURES.listObjectsRoot)
      }),
    )
    const { result } = renderHook(
      () =>
        useObjects({
          bucket: 'my-bucket',
          prefix: '',
          pageSize: 50,
          continuationToken: null,
        }),
      { wrapper: makeWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedUrl!.searchParams.has('prefix')).toBe(false)
    expect(capturedUrl!.searchParams.has('continuation-token')).toBe(false)
  })

  test('returns folders first then files from ListObjectsResult', async () => {
    mswServer.use(...s3Handlers)
    const { result } = renderHook(
      () =>
        useObjects({
          bucket: 'my-bucket',
          prefix: '',
          pageSize: 50,
          continuationToken: null,
        }),
      { wrapper: makeWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const entries = result.current.data!.entries
    expect(entries.length).toBeGreaterThanOrEqual(3)
    expect(entries[0]?.kind).toBe('folder')
    expect(entries[1]?.kind).toBe('folder')
    expect(entries[2]?.kind).toBe('file')
    expect(result.current.data!.isTruncated).toBe(false)
  })

  test('placeholderData keeps previous page visible during refetch', async () => {
    let callIndex = 0
    mswServer.use(
      http.get('*/my-bucket', () => {
        const body =
          callIndex++ === 0
            ? S3_FIXTURES.listObjectsRoot
            : S3_FIXTURES.listObjectsTruncated
        return HttpResponse.xml(body)
      }),
    )
    function Harness() {
      const [token, setToken] = useState<string | null>(null)
      const q = useObjects({
        bucket: 'my-bucket',
        prefix: '',
        pageSize: 50,
        continuationToken: token,
      })
      return { q, setToken }
    }
    const { result } = renderHook(() => Harness(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.q.isSuccess).toBe(true))
    const firstPageEntries = result.current.q.data!.entries
    expect(firstPageEntries.length).toBeGreaterThanOrEqual(3)

    // Trigger refetch with new key; while new request is in flight, data should
    // remain the previous page (placeholderData).
    act(() => result.current.setToken('next-token-abc'))
    // Immediately after the key change, data should still be the previous page.
    expect(result.current.q.data!.entries.length).toBe(firstPageEntries.length)
    await waitFor(() =>
      expect(result.current.q.data!.entries[0]?.kind).toBe('file'),
    )
  })

  test('query is disabled when bucket is empty', () => {
    const { result } = renderHook(
      () =>
        useObjects({
          bucket: '',
          prefix: '',
          pageSize: 50,
          continuationToken: null,
        }),
      { wrapper: makeWrapper() },
    )
    expect(result.current.fetchStatus).toBe('idle')
  })

  test('objectsQueryKey builder returns a stable prefix-scoped key', () => {
    const key = objectsQueryKey('my-bucket', 'photos/')
    expect(key).toEqual(['s3', 'objects', 'my-bucket', 'photos/'])
  })
})
