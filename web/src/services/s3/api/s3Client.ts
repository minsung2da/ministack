import { apiClient } from '../../../shared/api/client'

// Resolve URLs against window.location.origin so the client works both in the
// browser (same-origin) and in jsdom tests (undici rejects bare '/' URLs).
const ORIGIN =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : ''

/**
 * Dummy SigV4 Authorization header. MiniStack does not verify signatures but
 * checks presence for some paths. Mirrors the pattern used by ec2Client.ts.
 */
export const AUTHORIZATION =
  'AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/s3/aws4_request'

/**
 * Encodes each segment of an S3 object key independently so that slashes are
 * preserved (they are part of the path) while special characters inside each
 * segment (space, unicode, punctuation) are percent-encoded.
 *
 * [Pitfall 1] `encodeURIComponent` on the full key would turn `/` into `%2F`,
 * which breaks backend routing.
 */
export function encodeS3Key(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/')
}

function toUrl(path: string): string {
  return `${ORIGIN}${path}`
}

/**
 * Executes `GET path` against S3 and returns the response body as text.
 * Use for XML responses (ListBuckets, ListObjectsV2, GetObjectTagging).
 */
export async function s3Get(
  path: string,
  searchParams?: Record<string, string>,
): Promise<string> {
  return apiClient
    .get(toUrl(path), {
      headers: { Authorization: AUTHORIZATION },
      searchParams,
    })
    .text()
}

/**
 * Executes `GET path` against S3 and returns the raw Response (for binary
 * bodies or header inspection — e.g. GetObject for download).
 */
export async function s3GetResponse(
  path: string,
  searchParams?: Record<string, string>,
): Promise<Response> {
  return apiClient.get(toUrl(path), {
    headers: { Authorization: AUTHORIZATION },
    searchParams,
  })
}

/**
 * Executes `HEAD path` against S3 using native fetch.
 * Uses native fetch because some ky builds coerce HEAD responses.
 */
export async function s3Head(path: string): Promise<Response> {
  return fetch(toUrl(path), {
    method: 'HEAD',
    headers: { Authorization: AUTHORIZATION },
  })
}

/**
 * Executes `PUT path` against S3. Body may be any `BodyInit` (File, Blob,
 * string, etc.). Additional headers are merged on top of Authorization.
 */
export async function s3Put(
  path: string,
  body?: BodyInit,
  headers: Record<string, string> = {},
): Promise<void> {
  await apiClient.put(toUrl(path), {
    headers: { Authorization: AUTHORIZATION, ...headers },
    body,
  })
}

/**
 * Executes `DELETE path` against S3. `searchParams` support endpoint queries
 * like `?tagging` or per-object deletes.
 */
export async function s3Delete(
  path: string,
  searchParams?: Record<string, string>,
): Promise<void> {
  await apiClient.delete(toUrl(path), {
    headers: { Authorization: AUTHORIZATION },
    searchParams,
  })
}

/**
 * Executes `POST path?delete` with an XML body — the DeleteObjects batch API.
 * Returns the XML response text for the caller to parse (per-key results).
 */
export async function s3PostDelete(path: string, xml: string): Promise<string> {
  return apiClient
    .post(toUrl(path), {
      headers: {
        Authorization: AUTHORIZATION,
        'Content-Type': 'application/xml',
      },
      body: xml,
      searchParams: { delete: '' },
    })
    .text()
}
