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
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { lambdaHandlers } from '../__tests__/msw-handlers'
import { LAMBDA_FIXTURES } from '../__tests__/fixtures'
import {
  useCreateFunction,
  useDeleteFunction,
  useUpdateConfiguration,
} from './functionMutations'
import type { CreateFunctionInput } from './functionMutations'

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

describe('useCreateFunction [LAM-01 / D-02]', () => {
  test('zip source POSTs Code.ZipFile + PackageType=Zip', async () => {
    let body: any = null
    mswServer.use(
      http.post('*/2015-03-31/functions', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(LAMBDA_FIXTURES.createFunctionResponse, {
          status: 201,
        })
      }),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateFunction(), {
      wrapper: Wrapper,
    })
    const input: CreateFunctionInput = {
      FunctionName: 'new-func',
      Runtime: 'python3.12',
      Role: 'arn:aws:iam::000000000000:role/lambda-role',
      Handler: 'index.handler',
      Code: { kind: 'zip', ZipFile: 'BASE64CONTENT' },
    }
    await act(async () => {
      await result.current.mutateAsync(input)
    })
    expect(body.Code).toEqual({ ZipFile: 'BASE64CONTENT' })
    expect(body.PackageType).toBe('Zip')
    expect(body.FunctionName).toBe('new-func')
  })

  test('s3 source POSTs Code.S3Bucket + Code.S3Key + PackageType=Zip', async () => {
    let body: any = null
    mswServer.use(
      http.post('*/2015-03-31/functions', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(LAMBDA_FIXTURES.createFunctionResponse, {
          status: 201,
        })
      }),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateFunction(), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({
        FunctionName: 'f',
        Runtime: 'python3.12',
        Role: 'arn:aws:iam::000000000000:role/r',
        Handler: 'index.handler',
        Code: { kind: 's3', S3Bucket: 'b', S3Key: 'k' },
      })
    })
    expect(body.Code).toEqual({ S3Bucket: 'b', S3Key: 'k' })
    expect(body.PackageType).toBe('Zip')
  })

  test('image source POSTs Code.ImageUri + PackageType=Image', async () => {
    let body: any = null
    mswServer.use(
      http.post('*/2015-03-31/functions', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(LAMBDA_FIXTURES.createFunctionResponse, {
          status: 201,
        })
      }),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateFunction(), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({
        FunctionName: 'f',
        Runtime: 'python3.12',
        Role: 'arn:aws:iam::000000000000:role/r',
        Handler: 'index.handler',
        Code: { kind: 'image', ImageUri: 'uri' },
      })
    })
    expect(body.Code).toEqual({ ImageUri: 'uri' })
    expect(body.PackageType).toBe('Image')
  })

  test('invalidates only ["lambda","functions"] on success (Pitfall C-3)', async () => {
    mswServer.use(...lambdaHandlers)
    const { client, Wrapper } = makeWrapper()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateFunction(), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({
        FunctionName: 'new-func',
        Runtime: 'python3.12',
        Role: 'arn:aws:iam::000000000000:role/r',
        Handler: 'index.handler',
        Code: { kind: 'zip', ZipFile: 'x' },
      })
    })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({ queryKey: ['lambda', 'functions'] })
  })
})

describe('useDeleteFunction [LAM-01 / Pitfall 9]', () => {
  test('DELETEs /functions/{name} with NO Qualifier (Pitfall 9)', async () => {
    let capturedUrl = ''
    mswServer.use(
      http.delete('*/2015-03-31/functions/:name', ({ request }) => {
        capturedUrl = request.url
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteFunction(), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync('hello')
    })
    const url = new URL(capturedUrl)
    expect(url.pathname).toBe('/2015-03-31/functions/hello')
    expect(url.searchParams.has('Qualifier')).toBe(false)
    expect(url.search).toBe('')
  })

  test('on success invalidates ["lambda","functions"] and removes ["lambda","function", name]', async () => {
    mswServer.use(...lambdaHandlers)
    const { client, Wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const removeSpy = vi.spyOn(client, 'removeQueries')
    const { result } = renderHook(() => useDeleteFunction(), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync('hello')
    })
    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: ['lambda', 'function', 'hello'],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['lambda', 'functions'],
    })
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
  })
})

describe('useUpdateConfiguration [LAM-01 / Pitfall C-3]', () => {
  test('PUTs body and invalidates ONLY ["lambda","function", name] (not functions list)', async () => {
    let body: any = null
    let capturedUrl = ''
    mswServer.use(
      http.put(
        '*/2015-03-31/functions/:name/configuration',
        async ({ request }) => {
          capturedUrl = request.url
          body = await request.json()
          return HttpResponse.json(LAMBDA_FIXTURES.updateConfigResponse)
        },
      ),
    )
    const { client, Wrapper } = makeWrapper()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateConfiguration(), {
      wrapper: Wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({
        name: 'hello',
        patch: { Timeout: 30, MemorySize: 512 },
      })
    })
    const url = new URL(capturedUrl)
    expect(url.pathname).toBe('/2015-03-31/functions/hello/configuration')
    expect(body).toEqual({ Timeout: 30, MemorySize: 512 })
    // Pitfall C-3: single invalidation, and ONLY the function detail key — not the list.
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['lambda', 'function', 'hello'],
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: ['lambda', 'functions'],
    })
  })
})
