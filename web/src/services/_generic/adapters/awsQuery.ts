/**
 * AWS-Query transport for the generic service framework (Plan 05-01).
 *
 * Used by IAM, STS. Protocol shape:
 *   POST /
 *   Content-Type: application/x-www-form-urlencoded
 *   Authorization: AWS4-HMAC-SHA256 Credential=test/.../<scope>/aws4_request
 *   Body: Action={action}&Version={version}&...
 *
 * Returns the raw XML string — the descriptor's parseResponse is
 * responsible for DOMParser-based extraction. Keeping the adapter
 * transport-only preserves orthogonality.
 *
 * `buildAwsQueryRequest` is PURE (D-07 preview); `awsQueryCall`
 * internally uses it to close Pitfall 7.2.6.
 */

export type AwsQuerySpec = {
  action: string
  version: string
  credentialScope: string
  params: Record<string, string>
}

function authHeader(scope: string): string {
  return `AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/${scope}/aws4_request`
}

export function buildAwsQueryRequest(spec: AwsQuerySpec): {
  url: string
  headers: Record<string, string>
  body: string
} {
  const params = new URLSearchParams({
    Action: spec.action,
    Version: spec.version,
    ...spec.params,
  })
  return {
    url: '/',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: authHeader(spec.credentialScope),
    },
    body: params.toString(),
  }
}

export async function awsQueryCall(spec: AwsQuerySpec): Promise<string> {
  const req = buildAwsQueryRequest(spec)
  const res = await fetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: req.body,
  })
  if (!res.ok) {
    throw new Error(`aws-query ${spec.action} failed ${res.status}`)
  }
  return res.text()
}
