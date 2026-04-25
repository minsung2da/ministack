/**
 * REST transport for the generic service framework (Plan 05-01).
 *
 * Reserved for forward compatibility — no Phase 5 descriptor currently
 * uses this adapter, but the type must exist so buildRequest's
 * discriminated union stays exhaustive.
 *
 * `buildRestRequest` is PURE (D-07 preview); `restCall` internally uses
 * it to close Pitfall 7.2.6.
 */

export type RestSpec = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  credentialScope: string
  body?: unknown
  searchParams?: Record<string, string>
}

function authHeader(scope: string): string {
  return `AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/${scope}/aws4_request`
}

export function buildRestRequest(spec: RestSpec): {
  url: string
  method: string
  headers: Record<string, string>
  body: string | undefined
} {
  const qs =
    spec.searchParams && Object.keys(spec.searchParams).length > 0
      ? `?${new URLSearchParams(spec.searchParams).toString()}`
      : ''
  return {
    url: `${spec.path}${qs}`,
    method: spec.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(spec.credentialScope),
    },
    body: spec.body !== undefined ? JSON.stringify(spec.body) : undefined,
  }
}

export async function restCall(spec: RestSpec): Promise<unknown> {
  const req = buildRestRequest(spec)
  const res = await fetch(req.url, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  })
  if (!res.ok) {
    throw new Error(`rest ${spec.method} ${spec.path} failed ${res.status}`)
  }
  const contentType = res.headers.get('content-type') ?? ''
  return contentType.includes('application/json') ? res.json() : res.text()
}
