import {
  describe,
  test,
  expect,
  vi,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { makeHookHarness } from '../../../test/hookWrapper'
import {
  useDescriptorMutation,
  OperationNotSupportedError,
} from './useGenericMutation'
import type { ServiceDescriptor } from '../types'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

const createCapableDescriptor: ServiceDescriptor = {
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
  mutations: {
    create: {
      adapter: 'aws-json',
      target: 'Fake.Create',
      credentialScope: 'fake',
      bodyShape: {
        fields: [
          { name: 'name', kind: 'string', required: true, label: 'Name' },
        ],
      },
      successFlashbar: 'Created',
    },
  },
}

const readOnlyDescriptor: ServiceDescriptor = {
  serviceKey: 'ro',
  displayName: 'Read Only',
  idField: 'id',
  list: {
    endpoint: {
      adapter: 'aws-json',
      target: 'RO.List',
      credentialScope: 'ro',
    },
    parseResponse: () => [],
    columns: [],
  },
}

describe('_generic/hooks/useGenericMutation', () => {
  test('preview() returns buildRequest output (D-07) — pure, no HTTP', () => {
    const registry = { fake: createCapableDescriptor }
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(
      () => useDescriptorMutation('fake', 'create', registry),
      { wrapper: Wrapper },
    )
    const preview = result.current.preview({ name: 'alpha' })
    expect(preview.url).toBe('/')
    expect(preview.headers['X-Amz-Target']).toBe('Fake.Create')
    expect(preview.body).toBe(JSON.stringify({ name: 'alpha' }))
  })

  test('send() fires mutation with byte-identical body to preview() (Pitfall 7.2.6)', async () => {
    const captured: { raw: string } = { raw: '' }
    mswServer.use(
      http.post('*/', async ({ request }) => {
        captured.raw = await request.text()
        return HttpResponse.json({ ok: true })
      }),
    )
    const registry = { fake: createCapableDescriptor }
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(
      () => useDescriptorMutation('fake', 'create', registry),
      { wrapper: Wrapper },
    )
    const input = { name: 'byte-equal' }
    const preview = result.current.preview(input)
    await act(async () => {
      await result.current.sendAsync(input)
    })
    // Pitfall 7.2.6 regression-lock.
    expect(captured.raw).toBe(preview.body)
  })

  test('onSuccess invalidates genericKeys.list(serviceKey) exactly once (Pitfall C-3)', async () => {
    mswServer.use(http.post('*/', () => HttpResponse.json({ ok: true })))
    const registry = { fake: createCapableDescriptor }
    const { client, Wrapper } = makeHookHarness()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(
      () => useDescriptorMutation('fake', 'create', registry),
      { wrapper: Wrapper },
    )
    await act(async () => {
      await result.current.sendAsync({ name: 'x' })
    })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['generic', 'fake', 'list'],
    })
  })

  test('missing mutations.create — isSupported false, preview throws OperationNotSupportedError (D-02)', () => {
    const registry = { ro: readOnlyDescriptor }
    const { Wrapper } = makeHookHarness()
    const { result } = renderHook(
      () => useDescriptorMutation('ro', 'create', registry),
      { wrapper: Wrapper },
    )
    expect(result.current.isSupported).toBe(false)
    expect(() => result.current.preview({})).toThrow(
      OperationNotSupportedError,
    )
  })
})
