import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { makeHookHarness } from '../../../test/hookWrapper'
import { useDescriptorList } from './useGenericList'
import type { ServiceDescriptor } from '../types'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

type FakeRow = { id: string; name: string }

const fakeListDescriptor: ServiceDescriptor<FakeRow> = {
  serviceKey: 'fake',
  displayName: 'Fake',
  idField: 'id',
  list: {
    endpoint: {
      adapter: 'aws-json',
      target: 'Fake.List',
      credentialScope: 'fake',
    },
    parseResponse: (raw) => {
      const obj = raw as { Items: FakeRow[] }
      return obj.Items
    },
    columns: [],
  },
}

const singletonDescriptor: ServiceDescriptor = {
  serviceKey: 'sts',
  displayName: 'STS',
  kind: 'singleton',
  idField: 'Account',
  list: {
    endpoint: {
      adapter: 'aws-query',
      action: 'GetCallerIdentity',
      version: '2011-06-15',
      credentialScope: 'sts',
    },
    parseResponse: () => [],
    columns: [],
  },
}

describe('_generic/hooks/useGenericList', () => {
  test('calls descriptor.list.endpoint adapter and passes raw to parseResponse', async () => {
    let capturedTarget = ''
    mswServer.use(
      http.post('*/', ({ request }) => {
        capturedTarget = request.headers.get('x-amz-target') ?? ''
        return HttpResponse.json({
          Items: [
            { id: '1', name: 'alpha' },
            { id: '2', name: 'beta' },
          ],
        })
      }),
    )
    const registry = { fake: fakeListDescriptor } as unknown as Record<
      string,
      ServiceDescriptor
    >
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(
      () => useDescriptorList<FakeRow>('fake', registry),
      { wrapper: Wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedTarget).toBe('Fake.List')
    expect(result.current.data).toEqual([
      { id: '1', name: 'alpha' },
      { id: '2', name: 'beta' },
    ])
  })

  test('queryKey is genericKeys.list(serviceKey)', async () => {
    mswServer.use(
      http.post('*/', () =>
        HttpResponse.json({ Items: [] as FakeRow[] }),
      ),
    )
    const registry = { fake: fakeListDescriptor } as unknown as Record<
      string,
      ServiceDescriptor
    >
    const { client, Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useDescriptorList('fake', registry), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const cached = client.getQueryData(['generic', 'fake', 'list'])
    expect(cached).toEqual([])
  })

  test('kind: "singleton" descriptor disables the list query', () => {
    const registry = { sts: singletonDescriptor }
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(() => useDescriptorList('sts', registry), {
      wrapper: Wrapper,
    })
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })
})
