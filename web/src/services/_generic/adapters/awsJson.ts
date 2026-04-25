/**
 * AWS-JSON transport for the generic service framework (Plan 05-01).
 *
 * Used by DynamoDB (DynamoDB_20120810.*), KMS (TrentService.*), SSM
 * (AmazonSSM.*), Secrets Manager (secretsmanager.*). Protocol shape:
 *   POST /
 *   Content-Type: application/x-amz-json-1.0
 *   X-Amz-Target: {service}.{operation}
 *   Authorization: AWS4-HMAC-SHA256 Credential=test/.../<scope>/aws4_request
 *   Body: JSON
 *
 * `buildAwsJsonRequest` is PURE (D-07 preview). `awsJsonCall` = buildRequest
 * + fetch. They MUST share a single source of truth (Pitfall 7.2.6).
 */

export type AwsJsonSpec = {
  target: string
  credentialScope: string
  body: object
}

function authHeader(scope: string): string {
  return `AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/${scope}/aws4_request`
}

export function buildAwsJsonRequest(spec: AwsJsonSpec): {
  url: string
  headers: Record<string, string>
  body: string
} {
  return {
    url: '/',
    headers: {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': spec.target,
      Authorization: authHeader(spec.credentialScope),
    },
    body: JSON.stringify(spec.body),
  }
}

export async function awsJsonCall(spec: AwsJsonSpec): Promise<unknown> {
  const req = buildAwsJsonRequest(spec)
  const res = await fetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: req.body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `aws-json ${spec.target} failed ${res.status}: ${text}`,
    )
  }
  return res.json()
}
