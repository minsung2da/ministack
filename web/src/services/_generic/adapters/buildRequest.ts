/**
 * Pure buildRequest dispatcher (Plan 05-01).
 *
 * Given a discriminated union input, returns `{ url, headers, body, method? }`
 * by delegating to the per-adapter builder. NEVER calls fetch.
 *
 * Used by:
 *   - D-07 "Review request" preview panel (render output in <pre>)
 *   - Each adapter's `*Call` function (shared source of truth → Pitfall 7.2.6)
 *
 * If a new adapter is added, the switch must be exhausted — TS will error
 * on a missing case.
 */

import {
  buildAwsJsonRequest,
  type AwsJsonSpec,
} from './awsJson'
import {
  buildAwsQueryRequest,
  type AwsQuerySpec,
} from './awsQuery'
import { buildRestRequest, type RestSpec } from './rest'

export type BuildInput =
  | ({ adapter: 'aws-json' } & AwsJsonSpec)
  | ({ adapter: 'aws-query' } & AwsQuerySpec)
  | ({ adapter: 'rest' } & RestSpec)

export type BuiltRequest = {
  url: string
  headers: Record<string, string>
  body: string | undefined
  method?: string
}

export function buildRequest(input: BuildInput): BuiltRequest {
  switch (input.adapter) {
    case 'aws-json':
      return buildAwsJsonRequest(input)
    case 'aws-query':
      return buildAwsQueryRequest(input)
    case 'rest':
      return buildRestRequest(input)
  }
}
