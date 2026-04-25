import { http, HttpResponse, type HttpHandler } from 'msw'

/**
 * MSW handlers for the generic service framework adapter tests.
 *
 * Each handler captures the incoming request shape and echoes a minimal
 * response appropriate to the transport. Tests use `lastCaptured.*` to
 * assert the request payload that the adapter emitted — this is how
 * Pitfall 7.2.6 (buildRequest vs send drift) is verified.
 *
 * Plan 00 intended to seed this file as part of the Wave 0 test scaffold;
 * that plan's output is not present on this worktree's base, so these
 * handlers are introduced here (documented as a Rule 3 deviation in
 * 05-01-SUMMARY.md).
 */

export type CapturedRequest = {
  url: string
  method: string
  headers: Record<string, string>
  body: string
}

export const lastCaptured: { request: CapturedRequest | null } = {
  request: null,
}

async function capture(request: Request): Promise<CapturedRequest> {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  return {
    url: request.url,
    method: request.method,
    headers,
    body: await request.text(),
  }
}

export const genericHandlers: HttpHandler[] = [
  // AWS-JSON — any POST / with X-Amz-Target returns a JSON echo.
  http.post('*/', async ({ request }) => {
    const target = request.headers.get('x-amz-target')
    const contentType = request.headers.get('content-type') ?? ''

    lastCaptured.request = await capture(request.clone())

    if (target) {
      // aws-json
      return HttpResponse.json({ ok: true, target })
    }

    if (contentType.includes('x-www-form-urlencoded')) {
      // aws-query — return XML string
      return HttpResponse.xml(
        '<Response><Result>ok</Result></Response>',
      )
    }

    // rest JSON POST
    return HttpResponse.json({ ok: true })
  }),

  // REST — arbitrary path methods used by the rest adapter test.
  http.get('*/rest/ping', async ({ request }) => {
    lastCaptured.request = await capture(request.clone())
    return HttpResponse.json({ pong: true })
  }),
  http.put('*/rest/ping', async ({ request }) => {
    lastCaptured.request = await capture(request.clone())
    return HttpResponse.json({ put: true })
  }),
  http.delete('*/rest/ping', async ({ request }) => {
    lastCaptured.request = await capture(request.clone())
    return HttpResponse.json({ deleted: true })
  }),
]
