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
import { useFunctionUrl } from './useFunctionUrl'

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

describe('useFunctionUrl [LAM-03 / D-07]', () => {
  test('queries ListFunctionUrlConfigs (plural) /urls endpoint', async () => {
    mswServer.use(...lambdaHandlers)
    const { result } = renderHook(() => useFunctionUrl('hello'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.FunctionUrlConfigs).toHaveLength(1)
    expect(result.current.data?.FunctionUrlConfigs[0].AuthType).toBe('NONE')
    expect(result.current.data?.FunctionUrlConfigs[0].FunctionUrl).toContain(
      'lambda-url',
    )
  })

  test('returns empty array for unconfigured function (not 404)', async () => {
    mswServer.use(...lambdaHandlers)
    const { result } = renderHook(() => useFunctionUrl('no-url'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.FunctionUrlConfigs).toEqual([])
  })

  test('disables query when name is empty', () => {
    const { result } = renderHook(() => useFunctionUrl(''), {
      wrapper: makeWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
