import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest'
import { downloadObject } from './downloadClient'

describe('downloadObject', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let clickSpy: ReturnType<typeof vi.fn>
  let originalFetch: typeof fetch

  beforeEach(() => {
    vi.useFakeTimers()

    createObjectURL = vi.fn(() => 'blob:fake-url-1')
    revokeObjectURL = vi.fn()
    // jsdom does not implement URL.createObjectURL — stub it.
    ;(URL as unknown as { createObjectURL: typeof createObjectURL })
      .createObjectURL = createObjectURL
    ;(URL as unknown as { revokeObjectURL: typeof revokeObjectURL })
      .revokeObjectURL = revokeObjectURL

    clickSpy = vi.fn()
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag) as HTMLElement
      if (tag === 'a') {
        ;(el as HTMLAnchorElement).click = clickSpy
      }
      return el
    })

    originalFetch = global.fetch
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    global.fetch = originalFetch
  })

  test('fetches blob, creates anchor, sets download attr to basename', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' })
    global.fetch = vi.fn(async () =>
      new Response(blob, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      }),
    ) as unknown as typeof fetch

    await downloadObject('my-bucket', 'photos/cat.jpg')

    expect(global.fetch).toHaveBeenCalledWith(
      '/my-bucket/photos/cat.jpg',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('AWS4-HMAC-SHA256'),
        }),
      }),
    )
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  test('sets anchor download attribute to the key basename', async () => {
    const blob = new Blob(['hi'])
    global.fetch = vi.fn(async () => new Response(blob, { status: 200 })) as
      unknown as typeof fetch

    let capturedAnchor: HTMLAnchorElement | null = null
    const origCreate = document.createElement.bind(document)
    ;(document.createElement as unknown as { mockRestore: () => void })
      .mockRestore()
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag) as HTMLElement
      if (tag === 'a') {
        capturedAnchor = el as HTMLAnchorElement
        capturedAnchor.click = vi.fn()
      }
      return el
    })

    await downloadObject('my-bucket', 'photos/2026/cat.jpg')
    expect(capturedAnchor).not.toBeNull()
    expect(capturedAnchor!.getAttribute('download')).toBe('cat.jpg')
  })

  test('schedules URL.revokeObjectURL after 60000ms (Pitfall 7)', async () => {
    const blob = new Blob(['x'])
    global.fetch = vi.fn(async () => new Response(blob, { status: 200 })) as
      unknown as typeof fetch

    await downloadObject('b', 'k')
    expect(revokeObjectURL).not.toHaveBeenCalled()

    vi.advanceTimersByTime(59_999)
    expect(revokeObjectURL).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url-1')
  })

  test('throws on non-2xx response', async () => {
    global.fetch = vi.fn(async () =>
      new Response('error', { status: 500, statusText: 'Server Error' }),
    ) as unknown as typeof fetch

    await expect(downloadObject('b', 'k')).rejects.toThrow(/500/)
  })

  test('encodes key segments when constructing URL', async () => {
    const blob = new Blob(['x'])
    const fetchSpy = vi.fn(async () => new Response(blob, { status: 200 }))
    global.fetch = fetchSpy as unknown as typeof fetch

    await downloadObject('b', 'my folder/a b.txt')
    expect(fetchSpy).toHaveBeenCalledWith(
      '/b/my%20folder/a%20b.txt',
      expect.any(Object),
    )
  })
})
