import { describe, it, expect, beforeEach } from 'vitest'
import { mswServer } from '../../../test/msw'
import { setupMswForTest } from '../../../test/msw-setup'
import {
  genericHandlers,
  lastCaptured,
} from '../__tests__/msw-handlers'
import { awsJsonCall, buildAwsJsonRequest } from './awsJson'

setupMswForTest()

beforeEach(() => {
  mswServer.use(...genericHandlers)
  lastCaptured.request = null
})

describe('_generic/adapters/awsJson', () => {
  describe('buildAwsJsonRequest (pure)', () => {
    it('returns POST / with X-Amz-Target and JSON body', () => {
      const req = buildAwsJsonRequest({
        target: 'DynamoDB_20120810.ListTables',
        credentialScope: 'dynamodb',
        body: { ExclusiveStartTableName: 'a' },
      })

      expect(req.url).toBe('/')
      expect(req.headers['X-Amz-Target']).toBe(
        'DynamoDB_20120810.ListTables',
      )
      expect(req.headers['Content-Type']).toBe('application/x-amz-json-1.0')
      expect(req.headers.Authorization).toContain('dynamodb/aws4_request')
      expect(JSON.parse(req.body)).toEqual({
        ExclusiveStartTableName: 'a',
      })
    })

    it('different credentialScope changes only the Authorization line', () => {
      const a = buildAwsJsonRequest({
        target: 'T.X',
        credentialScope: 'kms',
        body: {},
      })
      const b = buildAwsJsonRequest({
        target: 'T.X',
        credentialScope: 'secretsmanager',
        body: {},
      })
      expect(a.body).toBe(b.body)
      expect(a.headers['X-Amz-Target']).toBe(b.headers['X-Amz-Target'])
      expect(a.headers.Authorization).not.toBe(b.headers.Authorization)
      expect(a.headers.Authorization).toContain('kms/aws4_request')
      expect(b.headers.Authorization).toContain('secretsmanager/aws4_request')
    })
  })

  describe('awsJsonCall (end-to-end via MSW)', () => {
    it('POSTs to / with X-Amz-Target and parses JSON response', async () => {
      const result = await awsJsonCall({
        target: 'DynamoDB_20120810.ListTables',
        credentialScope: 'dynamodb',
        body: { Limit: 10 },
      })

      expect(result).toEqual({
        ok: true,
        target: 'DynamoDB_20120810.ListTables',
      })
      expect(lastCaptured.request?.method).toBe('POST')
      expect(lastCaptured.request?.headers['x-amz-target']).toBe(
        'DynamoDB_20120810.ListTables',
      )
      expect(lastCaptured.request?.headers['content-type']).toContain(
        'application/x-amz-json-1.0',
      )
    })

    it('Pitfall 7.2.6: send payload is byte-identical to buildAwsJsonRequest', async () => {
      const spec = {
        target: 'TrentService.ListKeys',
        credentialScope: 'kms',
        body: { Limit: 50, Marker: 'cursor' },
      }
      const built = buildAwsJsonRequest(spec)
      await awsJsonCall(spec)

      expect(lastCaptured.request?.body).toBe(built.body)
      expect(lastCaptured.request?.headers['x-amz-target']).toBe(
        built.headers['X-Amz-Target'],
      )
      expect(lastCaptured.request?.headers['authorization']).toBe(
        built.headers.Authorization,
      )
    })

    it('throws on non-2xx responses', async () => {
      mswServer.use(
        (await import('msw')).http.post(
          '*/',
          () => new Response('boom', { status: 500 }),
        ),
      )
      await expect(
        awsJsonCall({
          target: 'Svc.Op',
          credentialScope: 'dynamodb',
          body: {},
        }),
      ).rejects.toThrow(/aws-json Svc.Op failed 500/)
    })
  })
})
