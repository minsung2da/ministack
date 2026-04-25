import { describe, it, expect, beforeEach } from 'vitest'
import { mswServer } from '../../../test/msw'
import { setupMswForTest } from '../../../test/msw-setup'
import {
  genericHandlers,
  lastCaptured,
} from '../__tests__/msw-handlers'
import { buildRestRequest, restCall } from './rest'

setupMswForTest()

beforeEach(() => {
  mswServer.use(...genericHandlers)
  lastCaptured.request = null
})

describe('_generic/adapters/rest', () => {
  describe('buildRestRequest (pure)', () => {
    it('GET with searchParams appends query string', () => {
      const req = buildRestRequest({
        method: 'GET',
        path: '/rest/ping',
        credentialScope: 'lambda',
        searchParams: { a: '1', b: 'two' },
      })
      expect(req.method).toBe('GET')
      expect(req.url).toBe('/rest/ping?a=1&b=two')
      expect(req.body).toBeUndefined()
      expect(req.headers.Authorization).toContain('lambda/aws4_request')
    })

    it('POST with body serializes JSON', () => {
      const req = buildRestRequest({
        method: 'POST',
        path: '/rest/ping',
        credentialScope: 'ec2',
        body: { hello: 'world' },
      })
      expect(req.method).toBe('POST')
      expect(req.url).toBe('/rest/ping')
      expect(req.body).toBe('{"hello":"world"}')
      expect(req.headers['Content-Type']).toBe('application/json')
    })

    it('omits query string when searchParams is empty', () => {
      const req = buildRestRequest({
        method: 'GET',
        path: '/rest/ping',
        credentialScope: 'x',
        searchParams: {},
      })
      expect(req.url).toBe('/rest/ping')
    })
  })

  describe('restCall (end-to-end via MSW)', () => {
    it('GET returns parsed JSON when server sends application/json', async () => {
      const result = await restCall({
        method: 'GET',
        path: '/rest/ping',
        credentialScope: 'x',
      })
      expect(result).toEqual({ pong: true })
    })

    it('Pitfall 7.2.6: PUT body byte-matches buildRestRequest output', async () => {
      const spec = {
        method: 'PUT' as const,
        path: '/rest/ping',
        credentialScope: 'x',
        body: { a: 1, b: [2, 3] },
      }
      const built = buildRestRequest(spec)
      await restCall(spec)
      expect(lastCaptured.request?.body).toBe(built.body)
      expect(lastCaptured.request?.method).toBe('PUT')
    })

    it('DELETE round-trips', async () => {
      const result = await restCall({
        method: 'DELETE',
        path: '/rest/ping',
        credentialScope: 'x',
      })
      expect(result).toEqual({ deleted: true })
    })

    it('throws on non-2xx responses', async () => {
      mswServer.use(
        (await import('msw')).http.get(
          '*/rest/ping',
          () => new Response('nope', { status: 404 }),
        ),
      )
      await expect(
        restCall({ method: 'GET', path: '/rest/ping', credentialScope: 'x' }),
      ).rejects.toThrow(/rest GET \/rest\/ping failed 404/)
    })
  })
})
