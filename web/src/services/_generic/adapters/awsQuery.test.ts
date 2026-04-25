import { describe, it, expect, beforeEach } from 'vitest'
import { mswServer } from '../../../test/msw'
import { setupMswForTest } from '../../../test/msw-setup'
import {
  genericHandlers,
  lastCaptured,
} from '../__tests__/msw-handlers'
import { awsQueryCall, buildAwsQueryRequest } from './awsQuery'

setupMswForTest()

beforeEach(() => {
  mswServer.use(...genericHandlers)
  lastCaptured.request = null
})

describe('_generic/adapters/awsQuery', () => {
  describe('buildAwsQueryRequest (pure)', () => {
    it('encodes Action + Version + params as form body', () => {
      const req = buildAwsQueryRequest({
        action: 'ListUsers',
        version: '2010-05-08',
        credentialScope: 'iam',
        params: { MaxItems: '10' },
      })

      expect(req.url).toBe('/')
      expect(req.headers['Content-Type']).toBe(
        'application/x-www-form-urlencoded',
      )
      expect(req.headers.Authorization).toContain('iam/aws4_request')

      const parsed = new URLSearchParams(req.body)
      expect(parsed.get('Action')).toBe('ListUsers')
      expect(parsed.get('Version')).toBe('2010-05-08')
      expect(parsed.get('MaxItems')).toBe('10')
    })

    it('URL-encodes special characters in param values (T-5-01-02)', () => {
      const req = buildAwsQueryRequest({
        action: 'ListUsers',
        version: '2010-05-08',
        credentialScope: 'iam',
        params: { PathPrefix: '/tenant&id=42' },
      })

      // & and = inside values must survive a round-trip without injecting
      // extra parameters.
      const parsed = new URLSearchParams(req.body)
      expect(parsed.get('PathPrefix')).toBe('/tenant&id=42')
      expect(parsed.get('id')).toBeNull()
    })
  })

  describe('awsQueryCall (end-to-end via MSW)', () => {
    it('returns the raw XML string without parsing', async () => {
      const xml = await awsQueryCall({
        action: 'GetCallerIdentity',
        version: '2011-06-15',
        credentialScope: 'sts',
        params: {},
      })

      expect(typeof xml).toBe('string')
      expect(xml).toContain('<Response>')
      expect(xml).toContain('<Result>ok</Result>')
    })

    it('Pitfall 7.2.6: send body matches buildAwsQueryRequest output', async () => {
      const spec = {
        action: 'ListUsers',
        version: '2010-05-08',
        credentialScope: 'iam',
        params: { MaxItems: '25' },
      }
      const built = buildAwsQueryRequest(spec)
      await awsQueryCall(spec)

      expect(lastCaptured.request?.body).toBe(built.body)
      expect(lastCaptured.request?.headers['authorization']).toBe(
        built.headers.Authorization,
      )
    })

    it('throws on non-2xx responses', async () => {
      mswServer.use(
        (await import('msw')).http.post(
          '*/',
          () => new Response('x', { status: 400 }),
        ),
      )
      await expect(
        awsQueryCall({
          action: 'ListUsers',
          version: '2010-05-08',
          credentialScope: 'iam',
          params: {},
        }),
      ).rejects.toThrow(/aws-query ListUsers failed 400/)
    })
  })
})
