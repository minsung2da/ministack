import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { mswServer } from '../../../test/msw'
import { lambdaHandlers } from '../__tests__/msw-handlers'
import { useInvoke } from './invokeMutation'

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

describe('useInvoke [LAM-02 / Pitfall 6]', () => {
  test('returns parsed body + base64-decoded UTF-8 logs (Pitfall 1 end-to-end)', async () => {
    mswServer.use(...lambdaHandlers)
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useInvoke('hello'), {
      wrapper: Wrapper,
    })
    let data: any = null
    await act(async () => {
      data = await result.current.mutateAsync({ x: 1 })
    })
    expect(data.body).toEqual({ statusCode: 200, body: 'hello world' })
    expect(data.logResult).toContain('안녕 from Lambda')
    expect(data.functionError).toBeNull()
  })

  test('surfaces functionError on mutation success (not as throw) — Pitfall 2', async () => {
    mswServer.use(...lambdaHandlers)
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useInvoke('boom'), {
      wrapper: Wrapper,
    })
    let data: any = null
    let thrown: unknown = null
    await act(async () => {
      try {
        data = await result.current.mutateAsync({})
      } catch (e) {
        thrown = e
      }
    })
    expect(thrown).toBeNull()
    expect(data.functionError).toBe('Unhandled')
  })

  test('does NOT invalidate any query on success (Pitfall 6 — cache-neutral)', async () => {
    mswServer.use(...lambdaHandlers)
    const { client, Wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const removeSpy = vi.spyOn(client, 'removeQueries')
    const { result } = renderHook(() => useInvoke('hello'), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({ x: 1 })
    })
    expect(invalidateSpy).not.toHaveBeenCalled()
    expect(removeSpy).not.toHaveBeenCalled()
  })
})
