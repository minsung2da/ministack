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
import { mswServer } from '../../../test/msw'
import { lambdaHandlers } from '../__tests__/msw-handlers'
import { useFunction } from './useFunction'

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

describe('useFunction [LAM-03]', () => {
  test('useFunction returns Configuration, Code, Tags', async () => {
    mswServer.use(...lambdaHandlers)
    const { result } = renderHook(() => useFunction('hello'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.Configuration.FunctionName).toBe('hello')
    expect(result.current.data?.Code).toBeDefined()
    expect(result.current.data?.Tags).toEqual({ team: 'platform' })
  })

  test('useFunction surfaces error status for missing function', async () => {
    mswServer.use(...lambdaHandlers)
    const { result } = renderHook(() => useFunction('missing'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  test('useFunction disables query when name is empty', () => {
    const { result } = renderHook(() => useFunction(''), {
      wrapper: makeWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
