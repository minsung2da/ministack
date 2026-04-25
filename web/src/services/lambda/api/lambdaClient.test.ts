import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import {
  lambdaGet,
  lambdaPost,
  lambdaPut,
  lambdaDelete,
  AUTHORIZATION,
} from './lambdaClient'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

describe('AUTHORIZATION', () => {
  test('uses SigV4 shape with lambda service scope', () => {
    expect(AUTHORIZATION).toContain('AWS4-HMAC-SHA256')
    expect(AUTHORIZATION).toContain('/lambda/aws4_request')
  })
})

describe('lambdaGet', () => {
  test('assembles path against window origin, sends Authorization, returns JSON', async () => {
    let capturedAuth = ''
    mswServer.use(
      http.get('*/2015-03-31/functions', ({ request }) => {
        capturedAuth = request.headers.get('authorization') ?? ''
        return HttpResponse.json({ Functions: [] })
      }),
    )

    const body = await lambdaGet<{ Functions: unknown[] }>(
      '/2015-03-31/functions',
    )
    expect(body).toEqual({ Functions: [] })
    expect(capturedAuth).toBe(AUTHORIZATION)
  })

  test('encodes searchParams onto the URL', async () => {
    let capturedUrl = ''
    mswServer.use(
      http.get('*/2015-03-31/event-source-mappings', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ EventSourceMappings: [] })
      }),
    )

    await lambdaGet('/2015-03-31/event-source-mappings', {
      FunctionName: 'hello',
      MaxItems: '50',
    })
    expect(capturedUrl).toContain('FunctionName=hello')
    expect(capturedUrl).toContain('MaxItems=50')
  })
})

describe('lambdaPost', () => {
  test('attaches Content-Type: application/json and JSON-stringifies body', async () => {
    let contentType = ''
    let bodyText = ''
    mswServer.use(
      http.post('*/2015-03-31/functions', async ({ request }) => {
        contentType = request.headers.get('content-type') ?? ''
        bodyText = await request.text()
        return HttpResponse.json({ ok: true }, { status: 201 })
      }),
    )

    const payload = { FunctionName: 'new-func', Runtime: 'python3.12' }
    const res = await lambdaPost<{ ok: boolean }>(
      '/2015-03-31/functions',
      payload,
    )
    expect(res).toEqual({ ok: true })
    expect(contentType).toContain('application/json')
    expect(JSON.parse(bodyText)).toEqual(payload)
  })
})

describe('lambdaPut', () => {
  test('JSON-stringifies body and returns parsed JSON', async () => {
    let bodyText = ''
    mswServer.use(
      http.put(
        '*/2015-03-31/functions/hello/configuration',
        async ({ request }) => {
          bodyText = await request.text()
          return HttpResponse.json({ Timeout: 30 })
        },
      ),
    )

    const res = await lambdaPut<{ Timeout: number }>(
      '/2015-03-31/functions/hello/configuration',
      { Timeout: 30 },
    )
    expect(res).toEqual({ Timeout: 30 })
    expect(JSON.parse(bodyText)).toEqual({ Timeout: 30 })
  })
})

describe('lambdaDelete', () => {
  test('issues DELETE and resolves to undefined on 204', async () => {
    let method = ''
    mswServer.use(
      http.delete('*/2015-03-31/functions/hello', ({ request }) => {
        method = request.method
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const result = await lambdaDelete('/2015-03-31/functions/hello')
    expect(result).toBeUndefined()
    expect(method).toBe('DELETE')
  })
})
