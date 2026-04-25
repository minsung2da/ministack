import { apiClient } from '../../../shared/api/client'

/**
 * AWS-JSON client wrapper for DynamoDB (Phase 5).
 *
 * Dispatch is by the X-Amz-Target HEADER, not the URL path (Pitfall 7.2.1 / §1).
 * All requests POST to '/' with Content-Type 'application/x-amz-json-1.0'.
 */

const ORIGIN =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : ''

/**
 * Dummy SigV4 Authorization header scoped to the dynamodb service.
 * MiniStack does not verify the signature but some code paths check presence.
 * Mirrors lambdaClient.AUTHORIZATION with the `dynamodb` service scope.
 */
export const AUTHORIZATION_DDB =
  'AWS4-HMAC-SHA256 Credential=test/20260417/us-east-1/dynamodb/aws4_request'

const DDB_TARGET_PREFIX = 'DynamoDB_20120810'

/**
 * POST an AWS-JSON request to DynamoDB.
 *
 * @param action DynamoDB action name (e.g. 'ListTables', 'Scan', 'PutItem').
 *               Joined with the DDB_20120810 target prefix in the X-Amz-Target header.
 * @param body   JSON request body (will be JSON.stringified).
 *
 * Throws on non-2xx responses with the backend body preserved so callers can
 * surface `__type` / `message` in a Flashbar (see threat T-5-02-02).
 */
export async function ddbJsonCall<T = unknown>(
  action: string,
  body: object,
): Promise<T> {
  try {
    return await apiClient
      .post(`${ORIGIN}/`, {
        headers: {
          'Content-Type': 'application/x-amz-json-1.0',
          // §1 / Pitfall 7.2.1: target is a HEADER, not a URL path component.
          'X-Amz-Target': `${DDB_TARGET_PREFIX}.${action}`,
          Authorization: AUTHORIZATION_DDB,
        },
        body: JSON.stringify(body),
      })
      .json<T>()
  } catch (error) {
    // ky raises HTTPError on non-2xx; re-wrap with DDB context for Flashbar.
    const httpError = error as {
      response?: Response
      message?: string
    }
    if (httpError.response) {
      const text = await httpError.response.text().catch(() => '')
      throw new Error(
        `DynamoDB ${action} failed ${httpError.response.status}: ${text}`,
      )
    }
    throw new Error(
      `DynamoDB ${action} failed: ${httpError.message ?? String(error)}`,
    )
  }
}
