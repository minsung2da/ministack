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
import { useDescriptorItem } from './useGenericItem'
import type { ServiceDescriptor } from '../types'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

const listDescriptor: ServiceDescriptor = {
  serviceKey: 'fake',
  displayName: 'Fake',
  idField: 'id',
  list: {
    endpoint: {
      adapter: 'aws-json',
      target: 'Fake.List',
      credentialScope: 'fake',
    },
    parseResponse: () => [],
    columns: [],
  },
  detail: {
    endpoint: {
      adapter: 'aws-json',
      target: 'Fake.Get',
      credentialScope: 'fake',
      buildBody: (id) => ({ Id: id }),
    },
    parseResponse: (raw) => raw as Record<string, unknown>,
  },
}

const singletonDescriptor: ServiceDescriptor = {
  serviceKey: 'sts',
  displayName: 'STS',
  kind: 'singleton',
  idField: 'Account',
  list: {
    endpoint: {
      adapter: 'aws-json',
      target: 'STS.Get',
      credentialScope: 'sts',
    },
    parseResponse: () => [],
    columns: [],
  },
  detail: {
    endpoint: {
      adapter: 'aws-json',
      target: 'STS.GetCallerIdentity',
      credentialScope: 'sts',
      buildBody: () => ({}),
    },
    parseResponse: (raw) => raw as Record<string, unknown>,
  },
}

describe('_generic/hooks/useGenericItem', () => {
  test('queryKey is genericKeys.item(serviceKey, id) and passes id to buildBody', async () => {
    const captured: { body: any } = { body: null }
    mswServer.use(
      http.post('*/', async ({ request }) => {
        captured.body = await request.json()
        return HttpResponse.json({ id: 'u-1', name: 'x' })
      }),
    )
    const registry = { fake: listDescriptor }
    const { client, Wrapper } = makeHookHarness()
    const { result } = renderHook(
      () => useDescriptorItem('fake', 'u-1', registry),
      { wrapper: Wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(captured.body).toEqual({ Id: 'u-1' })
    expect(client.getQueryData(['generic', 'fake', 'item', 'u-1'])).toEqual({
      id: 'u-1',
      name: 'x',
    })
  })

  test('kind: "singleton" descriptor fires on mount with empty id (STS case)', async () => {
    mswServer.use(
      http.post('*/', () =>
        HttpResponse.json({ Account: '000000000000', Arn: 'arn:test' }),
      ),
    )
    const registry = { sts: singletonDescriptor }
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(
      () => useDescriptorItem('sts', '', registry),
      { wrapper: Wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      Account: '000000000000',
      Arn: 'arn:test',
    })
  })

  test('list-kind descriptor with empty id is disabled', () => {
    const registry = { fake: listDescriptor }
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(
      () => useDescriptorItem('fake', '', registry),
      { wrapper: Wrapper },
    )
    expect(result.current.fetchStatus).toBe('idle')
  })
})
