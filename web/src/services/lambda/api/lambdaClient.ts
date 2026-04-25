import { apiClient } from '../../../shared/api/client'

/**
 * Resolve URLs against window.location.origin so the client works both in the
 * browser (same-origin) and in jsdom tests (undici rejects bare '/' URLs).
 */
const ORIGIN =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : ''

/**
 * Dummy SigV4 Authorization header. MiniStack does not verify signatures but
 * checks presence for some paths. Mirrors the pattern used by s3Client.ts
 * (with service scope `lambda` instead of `s3`).
 */
export const AUTHORIZATION =
  'AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/lambda/aws4_request'

function toUrl(path: string): string {
  return `${ORIGIN}${path}`
}

/**
 * GET {path} → JSON. Forwards optional searchParams.
 */
export async function lambdaGet<T>(
  path: string,
  searchParams?: Record<string, string>,
): Promise<T> {
  return apiClient
    .get(toUrl(path), {
      headers: { Authorization: AUTHORIZATION },
      searchParams,
    })
    .json<T>()
}

/**
 * POST {path} with JSON body → JSON response.
 */
export async function lambdaPost<T>(path: string, body: unknown): Promise<T> {
  return apiClient
    .post(toUrl(path), {
      headers: {
        Authorization: AUTHORIZATION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    .json<T>()
}

/**
 * PUT {path} with JSON body → JSON response.
 */
export async function lambdaPut<T>(path: string, body: unknown): Promise<T> {
  return apiClient
    .put(toUrl(path), {
      headers: {
        Authorization: AUTHORIZATION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    .json<T>()
}

/**
 * DELETE {path}. Resolves on 204 No Content.
 *
 * [Pitfall 9] No searchParams argument — Qualifier-based version delete is
 * not a Phase 4 concept, and accepting arbitrary params would make it easy
 * to misuse.
 */
export async function lambdaDelete(path: string): Promise<void> {
  await apiClient.delete(toUrl(path), {
    headers: { Authorization: AUTHORIZATION },
  })
}
