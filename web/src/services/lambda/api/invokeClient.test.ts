import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { lambdaHandlers } from '../__tests__/msw-handlers'
import { LAMBDA_FIXTURES } from '../__tests__/fixtures'
import { invokeFunction, decodeLogResult } from './invokeClient'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

describe('decodeLogResult', () => {
  test('returns null for null input', () => {
    expect(decodeLogResult(null)).toBeNull()
  })

  test('decodes base64 UTF-8 preserving multi-byte characters (Pitfall 1)', () => {
    const decoded = decodeLogResult(LAMBDA_FIXTURES.invokeSuccessLogBase64)
    // Must contain the Korean characters, NOT mojibake like ì•ˆë…•.
    expect(decoded).toContain('안녕 from Lambda')
  })
})

describe('invokeFunction — success path', () => {
  test('JSON-parses body, decodes UTF-8 log, exposes executedVersion', async () => {
    mswServer.use(...lambdaHandlers)
    const result = await invokeFunction('hello', { key: 'value' })

    expect(result.body).toEqual({ statusCode: 200, body: 'hello world' })
    expect(result.logResult).toContain('안녕 from Lambda') // Pitfall 1
    expect(result.functionError).toBeNull()
    expect(result.executedVersion).toBe('$LATEST')
  })

  test('sends X-Amz-Invocation-Type: RequestResponse and X-Amz-Log-Type: Tail', async () => {
    let captured: Record<string, string | null> = {}
    mswServer.use(
      http.post(
        '*/2015-03-31/functions/:name/invocations',
        ({ request }) => {
          captured = {
            invocationType: request.headers.get('x-amz-invocation-type'),
            logType: request.headers.get('x-amz-log-type'),
            authorization: request.headers.get('authorization'),
          }
          return new HttpResponse('{}', {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Amz-Executed-Version': '$LATEST',
            },
          })
        },
      ),
    )

    await invokeFunction('hello', {})
    expect(captured.invocationType).toBe('RequestResponse')
    expect(captured.logType).toBe('Tail')
    expect(captured.authorization).toContain('AWS4-HMAC-SHA256')
  })

  test('encodeURIComponent applied to function name (Pitfall 9)', async () => {
    let capturedUrl = ''
    mswServer.use(
      http.post(
        '*/2015-03-31/functions/:name/invocations',
        ({ request }) => {
          capturedUrl = request.url
          return new HttpResponse('{}', {
            status: 200,
            headers: { 'X-Amz-Executed-Version': '$LATEST' },
          })
        },
      ),
    )

    await invokeFunction('hello world', {})
    expect(capturedUrl).toContain('/2015-03-31/functions/hello%20world/invocations')
  })
})

describe('invokeFunction — error path', () => {
  test('functionError from X-Amz-Function-Error header (Pitfall 2); HTTP 200 does NOT throw', async () => {
    mswServer.use(...lambdaHandlers)
    const result = await invokeFunction('boom', {})

    expect(result.functionError).toBe('Unhandled')
    expect(result.body).toEqual({
      errorMessage: 'division by zero',
      errorType: 'Runtime.HandlerError',
    })
    expect(result.executedVersion).toBe('$LATEST')
  })
})

describe('invokeFunction — body parse fallback', () => {
  test('retains raw string body when response is not valid JSON (Pitfall 3)', async () => {
    mswServer.use(
      http.post('*/2015-03-31/functions/:name/invocations', () => {
        return new HttpResponse('plain text, not json', {
          status: 200,
          headers: { 'X-Amz-Executed-Version': '$LATEST' },
        })
      }),
    )

    const result = await invokeFunction('hello', {})
    expect(result.body).toBe('plain text, not json')
  })
})
