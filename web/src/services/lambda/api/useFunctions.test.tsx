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
import { lambdaHandlers } from '../__tests__/msw-handlers'
import { LAMBDA_FIXTURES } from '../__tests__/fixtures'
import { useFunctions } from './useFunctions'
import { lambdaKeys } from './lambdaKeys'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  return {
    client,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  }
}

describe('useFunctions [LAM-01]', () => {
  test('useFunctions queryKey reflects marker argument', () => {
    expect(lambdaKeys.functions(null)).toEqual(['lambda', 'functions', null])
    expect(lambdaKeys.functions('abc')).toEqual(['lambda', 'functions', 'abc'])
  })

  test('useFunctions parses Functions[] from ListFunctions response', async () => {
    mswServer.use(...lambdaHandlers)
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useFunctions(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.Functions).toHaveLength(2)
    expect(result.current.data?.Functions[0].FunctionName).toBe('hello')
  })

  test('useFunctions forwards Marker and returns truncated response', async () => {
    mswServer.use(...lambdaHandlers)
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useFunctions('hello'), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.Functions).toHaveLength(1)
    expect(result.current.data?.NextMarker).toBe('hello')
  })

  test('useFunctions forwards MaxItems query param', async () => {
    let capturedUrl = ''
    mswServer.use(
      http.get('*/2015-03-31/functions', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(LAMBDA_FIXTURES.listFunctionsEmpty)
      }),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useFunctions(null, 25), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = new URL(capturedUrl)
    expect(url.searchParams.get('MaxItems')).toBe('25')
    expect(url.searchParams.has('Marker')).toBe(false)
  })
})
