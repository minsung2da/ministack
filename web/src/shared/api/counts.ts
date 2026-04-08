import { apiClient } from './client'

export type CountSummary = {
  count: number
  states?: Record<string, number>
  noun?: string
}

// ky delegates to globalThis.fetch. In the browser, relative URLs resolve against
// window.location; under node+jsdom (vitest), undici's fetch rejects relative URLs
// with "Failed to parse URL from /". Resolving against window.location.origin keeps
// counts.ts isomorphic — same-origin in prod, absolute in tests.
const ORIGIN =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : ''

export async function countDynamoDbTables(): Promise<CountSummary> {
  const res = await apiClient
    .post(`${ORIGIN}/`, {
      headers: {
        'X-Amz-Target': 'DynamoDB_20120810.ListTables',
        'Content-Type': 'application/x-amz-json-1.0',
        Authorization:
          'AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/dynamodb/aws4_request',
      },
      body: '{}',
    })
    .json<{ TableNames?: string[] }>()
  return { count: res.TableNames?.length ?? 0, noun: 'tables' }
}

export async function countLambdaFunctions(): Promise<CountSummary> {
  const res = await apiClient
    .get(`${ORIGIN}/2015-03-31/functions/`)
    .json<{ Functions?: unknown[] }>()
  return { count: res.Functions?.length ?? 0, noun: 'functions' }
}

export async function countEc2Instances(): Promise<CountSummary> {
  const body = new URLSearchParams({
    Action: 'DescribeInstances',
    Version: '2016-11-15',
  }).toString()
  const text = await apiClient
    .post(`${ORIGIN}/`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/ec2/aws4_request',
      },
      body,
    })
    .text()

  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const instances = Array.from(doc.getElementsByTagName('instanceId'))
  const states: Record<string, number> = {}
  for (const inst of Array.from(doc.getElementsByTagName('instanceState'))) {
    const nameEl = inst.getElementsByTagName('name')[0]
    const name = nameEl?.textContent ?? 'unknown'
    states[name] = (states[name] ?? 0) + 1
  }
  return { count: instances.length, states, noun: 'instances' }
}

async function countUnsupported(): Promise<CountSummary> {
  return { count: Number.NaN, noun: 'resources' }
}

// Per 01-RESEARCH.md Pattern 7: Phase 1 ships real counters for ec2, lambda, dynamodb only.
// Everything else renders '—' via countUnsupported() / NaN guard in ServiceHome.
export const countersByService: Record<string, () => Promise<CountSummary>> = {
  ec2: countEc2Instances,
  lambda: countLambdaFunctions,
  dynamodb: countDynamoDbTables,
}

export { countUnsupported }
