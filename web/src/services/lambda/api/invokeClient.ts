import type { InvokeResult } from '../../../shared/types'
import { AUTHORIZATION } from './lambdaClient'

export type { InvokeResult }

/**
 * Decode the base64(utf-8) string returned by Lambda in the
 * `X-Amz-Log-Result` header.
 *
 * [Pitfall 1] `atob(b64)` returns a binary *string* where each char is a
 * byte. Using it directly mangles multi-byte UTF-8 sequences (Korean,
 * emoji, etc.). Go through Uint8Array + TextDecoder instead.
 */
export function decodeLogResult(b64: string | null): string | null {
  if (!b64) return null
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * Invoke a Lambda function synchronously and surface:
 *   - body           — function return value (JSON-parsed when possible)
 *   - logResult      — base64-decoded UTF-8 logs ([Pitfall 1])
 *   - functionError  — from `X-Amz-Function-Error` header ([Pitfall 2] —
 *                      invoke returns HTTP 200 even on function error)
 *   - executedVersion — from `X-Amz-Executed-Version` header
 *
 * Uses native `fetch` (not ky) because the Response's headers are the
 * product; ky's `.json()` would discard them.
 *
 * [Pitfall 8] No AbortController / client-side timeout — cold starts are
 * slow (10-30s) but legitimate; D-09 covers the UX.
 *
 * [Pitfall 9] encodeURIComponent on the function name so spaces etc. in
 * names don't break path construction.
 */
export async function invokeFunction(
  name: string,
  payload: unknown,
): Promise<InvokeResult> {
  const res = await fetch(
    `/2015-03-31/functions/${encodeURIComponent(name)}/invocations`,
    {
      method: 'POST',
      headers: {
        Authorization: AUTHORIZATION,
        'Content-Type': 'application/json',
        'X-Amz-Invocation-Type': 'RequestResponse',
        'X-Amz-Log-Type': 'Tail',
      },
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok && res.status !== 200) {
    throw new Error(`Invoke failed with ${res.status}: ${await res.text()}`)
  }
  const text = await res.text()
  let body: unknown = text
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      /* keep as raw string — [Pitfall 3] */
    }
  } else {
    body = null
  }
  return {
    body,
    logResult: decodeLogResult(res.headers.get('x-amz-log-result')),
    functionError: res.headers.get('x-amz-function-error'),
    executedVersion: res.headers.get('x-amz-executed-version'),
  }
}
