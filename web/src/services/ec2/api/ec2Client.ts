import { apiClient } from '../../../shared/api/client'

// Resolve URLs against window.location.origin so the client works both in
// the browser (same-origin) and in jsdom tests (undici rejects bare '/' URLs).
const ORIGIN =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : ''

const EC2_API_VERSION = '2016-11-15'
const AUTHORIZATION =
  'AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/ec2/aws4_request'

/**
 * Executes an EC2 Query protocol request.
 *
 * Builds a `application/x-www-form-urlencoded` POST body with the standard
 * `Action` + `Version` parameters, merges any additional `params`, and posts
 * to the MiniStack endpoint with a fake SigV4 Authorization header.
 *
 * Returns the raw XML response text for callers to parse.
 */
export async function ec2Query(
  action: string,
  params: Record<string, string> = {},
): Promise<string> {
  const body = new URLSearchParams({
    Action: action,
    Version: EC2_API_VERSION,
    ...params,
  }).toString()

  return apiClient
    .post(`${ORIGIN}/`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: AUTHORIZATION,
      },
      body,
    })
    .text()
}

/**
 * Appends a 1-based member list to `params` using the EC2 Query protocol
 * convention. For example, `addMemberList(params, 'InstanceId', ['i-abc'])` sets
 * `params['InstanceId.1'] = 'i-abc'`.
 *
 * Mutates `params` in place — callers own the object.
 */
export function addMemberList(
  params: Record<string, string>,
  key: string,
  ids: string[],
): void {
  ids.forEach((id, i) => {
    params[`${key}.${i + 1}`] = id
  })
}
