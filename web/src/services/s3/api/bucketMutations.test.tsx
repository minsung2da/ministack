import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { s3Handlers } from '../__tests__/msw-handlers'
import { useBuckets } from './useBuckets'
import { useCreateBucket, useDeleteBucket } from './bucketMutations'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
  return {
    client,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  }
}

describe('bucketMutations [S3-01]', () => {
  test('useCreateBucket issues PUT /{name} and invalidates [s3, buckets]', async () => {
    let putCalled = false
    let listCalls = 0
    mswServer.use(
      http.put('*/new-bucket', () => {
        putCalled = true
        return new HttpResponse(null, { status: 200 })
      }),
      http.get('*/', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.has('list-type')) return undefined
        listCalls += 1
        return HttpResponse.xml(
          `<?xml version="1.0"?><ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Buckets></Buckets></ListAllMyBucketsResult>`,
        )
      }),
    )
    const { Wrapper } = makeWrapper()

    const { result } = renderHook(
      () => ({ buckets: useBuckets(), create: useCreateBucket() }),
      { wrapper: Wrapper },
    )
    await waitFor(() => expect(result.current.buckets.isSuccess).toBe(true))
    const initialCalls = listCalls

    await act(async () => {
      await result.current.create.mutateAsync('new-bucket')
    })

    expect(putCalled).toBe(true)
    // On success the buckets query should be invalidated → refetch.
    await waitFor(() => expect(listCalls).toBeGreaterThan(initialCalls))
  })

  test('useDeleteBucket surfaces BucketNotEmpty error with typed code', async () => {
    mswServer.use(...s3Handlers)
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteBucket(), { wrapper: Wrapper })

    let thrown: unknown = null
    await act(async () => {
      try {
        await result.current.mutateAsync('not-empty')
      } catch (e) {
        thrown = e
      }
    })

    expect(thrown).toBeInstanceOf(Error)
    const err = thrown as Error & { code?: string }
    expect(err.code).toBe('BucketNotEmpty')
    expect(err.message.toLowerCase()).toContain('not empty')
  })

  test('useDeleteBucket succeeds and invalidates [s3, buckets]', async () => {
    let deleteCalled = false
    let listCalls = 0
    mswServer.use(
      http.delete('*/my-bucket', () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
      http.get('*/', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.has('list-type')) return undefined
        listCalls += 1
        return HttpResponse.xml(
          `<?xml version="1.0"?><ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Buckets></Buckets></ListAllMyBucketsResult>`,
        )
      }),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => ({ buckets: useBuckets(), del: useDeleteBucket() }),
      { wrapper: Wrapper },
    )
    await waitFor(() => expect(result.current.buckets.isSuccess).toBe(true))
    const initialCalls = listCalls

    await act(async () => {
      await result.current.del.mutateAsync('my-bucket')
    })

    expect(deleteCalled).toBe(true)
    await waitFor(() => expect(listCalls).toBeGreaterThan(initialCalls))
  })
})
