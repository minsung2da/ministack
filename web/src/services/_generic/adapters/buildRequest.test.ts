import { describe, it, expect, beforeEach } from 'vitest'
import { mswServer } from '../../../test/msw'
import { setupMswForTest } from '../../../test/msw-setup'
import {
  genericHandlers,
  lastCaptured,
} from '../__tests__/msw-handlers'
import { buildRequest } from './buildRequest'
import { awsJsonCall } from './awsJson'
import { awsQueryCall } from './awsQuery'
import { restCall } from './rest'

setupMswForTest()

beforeEach(() => {
  mswServer.use(...genericHandlers)
  lastCaptured.request = null
})

describe('_generic/adapters/buildRequest', () => {
  it('dispatches aws-json input to buildAwsJsonRequest output shape', () => {
    const req = buildRequest({
      adapter: 'aws-json',
      target: 'Svc.Op',
      credentialScope: 'kms',
      body: { hello: 'world' },
    })
    expect(req.url).toBe('/')
    expect(req.headers['X-Amz-Target']).toBe('Svc.Op')
    expect(req.headers['Content-Type']).toBe('application/x-amz-json-1.0')
  })

  it('dispatches aws-query input to form-encoded body', () => {
    const req = buildRequest({
      adapter: 'aws-query',
      action: 'ListUsers',
      version: '2010-05-08',
      credentialScope: 'iam',
      params: {},
    })
    expect(req.body).toContain('Action=ListUsers')
    expect(req.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    )
  })

  it('dispatches rest input with method and query string', () => {
    const req = buildRequest({
      adapter: 'rest',
      method: 'POST',
      path: '/foo',
      credentialScope: 'x',
      body: { k: 1 },
    })
    expect(req.method).toBe('POST')
    expect(req.url).toBe('/foo')
    expect(req.body).toBe('{"k":1}')
  })

  it('Pitfall 7.2.6 — aws-json: buildRequest byte-matches awsJsonCall send payload', async () => {
    const input = {
      adapter: 'aws-json' as const,
      target: 'DynamoDB_20120810.ListTables',
      credentialScope: 'dynamodb',
      body: { Limit: 5 },
    }
    const preview = buildRequest(input)
    await awsJsonCall(input)
    expect(lastCaptured.request?.body).toBe(preview.body)
    expect(lastCaptured.request?.headers['x-amz-target']).toBe(
      preview.headers['X-Amz-Target'],
    )
    expect(lastCaptured.request?.headers['authorization']).toBe(
      preview.headers.Authorization,
    )
  })

  it('Pitfall 7.2.6 — aws-query: buildRequest byte-matches awsQueryCall send payload', async () => {
    const input = {
      adapter: 'aws-query' as const,
      action: 'GetCallerIdentity',
      version: '2011-06-15',
      credentialScope: 'sts',
      params: { DurationSeconds: '900' },
    }
    const preview = buildRequest(input)
    await awsQueryCall(input)
    expect(lastCaptured.request?.body).toBe(preview.body)
    expect(lastCaptured.request?.headers['authorization']).toBe(
      preview.headers.Authorization,
    )
  })

  it('Pitfall 7.2.6 — rest: buildRequest byte-matches restCall send payload', async () => {
    const input = {
      adapter: 'rest' as const,
      method: 'PUT' as const,
      path: '/rest/ping',
      credentialScope: 'x',
      body: { z: true },
    }
    const preview = buildRequest(input)
    await restCall(input)
    expect(lastCaptured.request?.body).toBe(preview.body)
    expect(lastCaptured.request?.method).toBe('PUT')
  })
})
