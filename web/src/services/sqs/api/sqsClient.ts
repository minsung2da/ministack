/**
 * SQS transport client — D-10: AWS-JSON wire protocol (same pattern as DDB).
 *
 * This module is the single transport layer for every SQS call in Phase 5.
 * By funneling all SQS traffic through sqsJsonCall we close the Pitfall 7.2.3
 * bug class architecturally: nested shapes (MessageAttributes) are plain JSON
 * objects, NOT the legacy Query-path indexed keys. The acceptance grep refuses
 * any reintroduction of the legacy encoding — D-10 is enforced at the file
 * boundary.
 *
 * Pitfall 7.2.4 (ReceiptHandle lifecycle): MiniStack hands out bare UUIDs, but
 * real AWS ReceiptHandles contain '+', '/', '='. We always pass ReceiptHandle
 * inside the JSON body (DeleteMessage, PurgeQueue do not need it, ReceiveMessage
 * returns it) so URL-encoding is never a concern. Types (SqsMessage) store it
 * verbatim.
 */

/** Dummy SigV4 Authorization — MiniStack validates presence, not signature. */
export const AUTHORIZATION_SQS =
  'AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/sqs/aws4_request'

const SQS_TARGET_PREFIX = 'AmazonSQS'

/**
 * Resolve URLs against window.location.origin so the client works both in the
 * browser (same-origin) and in jsdom tests (undici rejects bare '/' URLs).
 * Mirrors the pattern used by lambdaClient.ts.
 */
const ORIGIN =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : ''

export async function sqsJsonCall<T = unknown>(
  action: string,
  body: object,
): Promise<T> {
  const res = await fetch(`${ORIGIN}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.0',
      // D-10 / §2: dispatch is by HEADER, not URL path or query param.
      'X-Amz-Target': `${SQS_TARGET_PREFIX}.${action}`,
      Authorization: AUTHORIZATION_SQS,
    },
    // Pitfall 7.2.4: ReceiptHandle lives in this JSON body — no URL encoding concern.
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SQS ${action} failed ${res.status}: ${text}`)
  }
  // §2.6: empty-poll ReceiveMessage returns `{}` (no Messages key).
  // Caller handles this shape — this layer just parses JSON.
  return res.json() as Promise<T>
}
