import { describe, test, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { S3_FIXTURES } from '../__tests__/fixtures'
import { useDeleteObject, useDeleteObjects } from './objectMutations'

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

describe('objectMutations [S3-03, S3-04]', () => {
  test('useDeleteObject encodes each key segment separately (Pitfall 1)', async () => {
    let capturedPath = ''
    mswServer.use(
      http.delete('*/my-bucket/*', ({ request }) => {
        capturedPath = new URL(request.url).pathname
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useDeleteObject('my-bucket', 'folder with spaces/'),
      { wrapper: Wrapper },
    )
    await act(async () => {
      await result.current.mutateAsync('folder with spaces/a b.txt')
    })
    // Each segment must be encoded independently — slashes preserved.
    expect(capturedPath).toBe('/my-bucket/folder%20with%20spaces/a%20b.txt')
  })

  test('useDeleteObject invalidates [s3, objects, bucket, prefix] on success', async () => {
    let deleteCalled = false
    mswServer.use(
      http.delete('*/my-bucket/*', () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { client, Wrapper } = makeWrapper()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(
      () => useDeleteObject('my-bucket', 'photos/'),
      { wrapper: Wrapper },
    )

    await act(async () => {
      await result.current.mutateAsync('photos/cat.jpg')
    })
    expect(deleteCalled).toBe(true)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['s3', 'objects', 'my-bucket', 'photos/'],
    })
  })

  test('useDeleteObjects builds POST /{bucket}?delete XML body (Pitfall 9)', async () => {
    let capturedBody = ''
    let capturedQuery = ''
    mswServer.use(
      http.post('*/my-bucket', async ({ request }) => {
        const url = new URL(request.url)
        if (!url.searchParams.has('delete')) return undefined
        capturedQuery = url.search
        capturedBody = await request.text()
        return HttpResponse.xml(S3_FIXTURES.deleteObjectsSuccess)
      }),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useDeleteObjects('my-bucket', ''),
      { wrapper: Wrapper },
    )
    await act(async () => {
      await result.current.mutateAsync(['photos/cat.jpg', 'photos/dog.jpg'])
    })
    expect(capturedQuery).toContain('delete')
    expect(capturedBody).toContain('<Delete>')
    expect(capturedBody).toContain('<Object><Key>photos/cat.jpg</Key></Object>')
    expect(capturedBody).toContain('<Object><Key>photos/dog.jpg</Key></Object>')
    expect(capturedBody).toContain('<Quiet>false</Quiet>')
  })

  test('useDeleteObjects escapes XML-special chars in keys', async () => {
    let capturedBody = ''
    mswServer.use(
      http.post('*/my-bucket', async ({ request }) => {
        capturedBody = await request.text()
        return HttpResponse.xml(S3_FIXTURES.deleteObjectsSuccess)
      }),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useDeleteObjects('my-bucket', ''),
      { wrapper: Wrapper },
    )
    await act(async () => {
      await result.current.mutateAsync(['a&b<c>.txt'])
    })
    expect(capturedBody).toContain('a&amp;b&lt;c&gt;.txt')
    expect(capturedBody).not.toContain('a&b<c>.txt')
  })

  test('useDeleteObjects surfaces per-key errors from Errors array', async () => {
    mswServer.use(
      http.post('*/my-bucket', () =>
        HttpResponse.xml(S3_FIXTURES.deleteObjectsPartial),
      ),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useDeleteObjects('my-bucket', 'photos/'),
      { wrapper: Wrapper },
    )
    let output: { deleted: string[]; errors: unknown[] } | null = null
    await act(async () => {
      output = await result.current.mutateAsync([
        'photos/cat.jpg',
        'photos/missing.jpg',
      ])
    })
    expect(output).not.toBeNull()
    expect(output!.deleted).toEqual(['photos/cat.jpg'])
    expect(output!.errors).toHaveLength(1)
    const err = output!.errors[0] as {
      key: string
      code: string
      message: string
    }
    expect(err.key).toBe('photos/missing.jpg')
    expect(err.code).toBe('NoSuchKey')
    expect(err.message).toContain('does not exist')
  })

  test('useDeleteObjects invalidates prefix-scoped query ONCE per batch (Pitfall 6)', async () => {
    mswServer.use(
      http.post('*/my-bucket', () =>
        HttpResponse.xml(S3_FIXTURES.deleteObjectsSuccess),
      ),
    )
    const { client, Wrapper } = makeWrapper()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(
      () => useDeleteObjects('my-bucket', 'photos/'),
      { wrapper: Wrapper },
    )
    await act(async () => {
      await result.current.mutateAsync([
        'photos/cat.jpg',
        'photos/dog.jpg',
        'photos/bird.jpg',
      ])
    })
    // Pitfall 6: one invalidation per batch, not per key.
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['s3', 'objects', 'my-bucket', 'photos/'],
    })
  })
})
