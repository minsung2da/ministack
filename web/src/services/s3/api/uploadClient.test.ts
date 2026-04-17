import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest'
import { uploadObject, uploadBatch } from './uploadClient'

/**
 * A hand-rolled XMLHttpRequest double. Tests drive lifecycle events
 * (`trigger*`) directly rather than over the network so we can deterministically
 * exercise progress, success, error, and abort paths.
 */
type Listener = (ev: Event) => void

class FakeXHR {
  static instances: FakeXHR[] = []

  upload = {
    _listeners: new Map<string, Listener[]>(),
    addEventListener(name: string, fn: Listener) {
      const arr = this._listeners.get(name) ?? []
      arr.push(fn)
      this._listeners.set(name, arr)
    },
  }

  private listeners = new Map<string, Listener[]>()
  method = ''
  url = ''
  headers: Record<string, string> = {}
  body: unknown = null
  status = 0
  statusText = ''
  responseText = ''
  aborted = false
  sent = false

  constructor() {
    FakeXHR.instances.push(this)
  }

  open(method: string, url: string) {
    this.method = method
    this.url = url
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }

  send(body: unknown) {
    this.body = body
    this.sent = true
  }

  abort() {
    this.aborted = true
    this.triggerAbort()
  }

  addEventListener(name: string, fn: Listener) {
    const arr = this.listeners.get(name) ?? []
    arr.push(fn)
    this.listeners.set(name, arr)
  }

  triggerUploadProgress(loaded: number, total: number) {
    const listeners = this.upload._listeners.get('progress') ?? []
    const ev = { lengthComputable: true, loaded, total } as unknown as Event
    for (const l of listeners) l(ev)
  }

  triggerLoad(status = 200, responseText = '') {
    this.status = status
    this.statusText = status === 200 ? 'OK' : 'Error'
    this.responseText = responseText
    const listeners = this.listeners.get('load') ?? []
    for (const l of listeners) l({} as Event)
  }

  triggerError() {
    const listeners = this.listeners.get('error') ?? []
    for (const l of listeners) l({} as Event)
  }

  triggerAbort() {
    const listeners = this.listeners.get('abort') ?? []
    for (const l of listeners) l({} as Event)
  }
}

beforeEach(() => {
  FakeXHR.instances = []
  vi.stubGlobal('XMLHttpRequest', FakeXHR)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function makeFile(name = 'a.txt', size = 1024, type = 'text/plain'): File {
  // File with explicit size — jsdom's File honors .size from the blob parts.
  const content = new Uint8Array(size)
  return new File([content], name, { type })
}

describe('uploadObject', () => {
  test('fires xhr.upload progress until resolve on 2xx', async () => {
    const progressEvents: Array<{ bytesUploaded: number; total: number }> = []
    const handle = uploadObject({
      bucket: 'my-bucket',
      key: 'a.txt',
      file: makeFile(),
      onProgress: (p) => progressEvents.push(p),
    })

    const xhr = FakeXHR.instances[0]
    expect(xhr.method).toBe('PUT')
    expect(xhr.url).toBe('/my-bucket/a.txt')
    expect(xhr.headers['Authorization']).toContain('AWS4-HMAC-SHA256')
    expect(xhr.headers['Content-Type']).toBe('text/plain')

    xhr.triggerUploadProgress(256, 1024)
    xhr.triggerUploadProgress(1024, 1024)
    xhr.triggerLoad(200, '')

    await handle.promise
    expect(progressEvents).toEqual([
      { bytesUploaded: 256, total: 1024 },
      { bytesUploaded: 1024, total: 1024 },
    ])
  })

  test('falls back to application/octet-stream when file type is empty', () => {
    uploadObject({
      bucket: 'b',
      key: 'k',
      file: makeFile('blob', 10, ''),
    })
    const xhr = FakeXHR.instances[0]
    expect(xhr.headers['Content-Type']).toBe('application/octet-stream')
  })

  test('encodes each key segment separately (Pitfall 1)', () => {
    uploadObject({
      bucket: 'b',
      key: 'my folder/a b.txt',
      file: makeFile(),
    })
    const xhr = FakeXHR.instances[0]
    expect(xhr.url).toBe('/b/my%20folder/a%20b.txt')
  })

  test('rejects with status in message on non-2xx', async () => {
    const handle = uploadObject({
      bucket: 'b',
      key: 'k',
      file: makeFile(),
    })
    const xhr = FakeXHR.instances[0]
    xhr.triggerLoad(500, 'Internal Server Error')

    await expect(handle.promise).rejects.toThrow(/500/)
  })

  test('rejects with cancelled=true when cancel() is called mid-flight', async () => {
    const handle = uploadObject({
      bucket: 'b',
      key: 'k',
      file: makeFile(),
    })
    handle.cancel()

    await expect(handle.promise).rejects.toMatchObject({ cancelled: true })
  })

  test('rejects with Network error message on transport failure', async () => {
    const handle = uploadObject({
      bucket: 'b',
      key: 'k',
      file: makeFile(),
    })
    FakeXHR.instances[0].triggerError()

    await expect(handle.promise).rejects.toThrow(/Network error/)
  })
})

describe('uploadBatch', () => {
  test('caps concurrency at 3', async () => {
    const items = Array.from({ length: 6 }, (_, i) => ({
      id: `f${i}`,
      bucket: 'b',
      key: `k${i}`,
      file: makeFile(`k${i}`),
    }))

    let maxInFlight = 0
    let inFlight = 0
    const startedIdx: number[] = []

    const batchPromise = uploadBatch(items, (id) => {
      startedIdx.push(Number(id.slice(1)))
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
    })

    // Tick microtasks so the first pool fills up.
    await Promise.resolve()
    await Promise.resolve()

    // Initially 3 should be in flight.
    expect(inFlight).toBe(3)
    expect(maxInFlight).toBe(3)

    // Resolve them sequentially; workers should pull from the queue.
    for (let i = 0; i < items.length; i++) {
      const xhr = FakeXHR.instances[i]
      xhr.triggerLoad(200, '')
      inFlight--
      await Promise.resolve()
      await Promise.resolve()
    }

    const results = await batchPromise
    expect(results).toHaveLength(6)
    expect(results.every((r) => r.status === 'success')).toBe(true)
    expect(maxInFlight).toBeLessThanOrEqual(3)
  })

  test('resolves per-file results array with mixed success, failure, cancelled', async () => {
    const items = [
      { id: 'a', bucket: 'b', key: 'a', file: makeFile('a') },
      { id: 'b', bucket: 'b', key: 'b', file: makeFile('b') },
      { id: 'c', bucket: 'b', key: 'c', file: makeFile('c') },
    ]

    const handles = new Map<string, ReturnType<typeof uploadObject>>()
    const batchPromise = uploadBatch(
      items,
      (id, handle) => handles.set(id, handle),
      3,
    )

    await Promise.resolve()
    await Promise.resolve()

    FakeXHR.instances[0].triggerLoad(200, '')
    FakeXHR.instances[1].triggerLoad(500, 'boom')
    handles.get('c')!.cancel()

    const results = await batchPromise
    expect(results[0]).toEqual({ id: 'a', status: 'success' })
    expect(results[1]).toMatchObject({ id: 'b', status: 'failure' })
    expect(results[2]).toEqual({ id: 'c', status: 'cancelled' })
  })
})
