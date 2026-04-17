import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import {
  s3Get,
  s3Put,
  s3Delete,
  s3PostDelete,
  encodeS3Key,
  AUTHORIZATION,
} from './s3Client'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

describe('encodeS3Key', () => {
  test('preserves slashes and encodes each segment separately', () => {
    expect(encodeS3Key('photos/cat.jpg')).toBe('photos/cat.jpg')
    expect(encodeS3Key('my folder/a b.txt')).toBe('my%20folder/a%20b.txt')
    expect(encodeS3Key('a/b c/d')).toBe('a/b%20c/d')
  })

  test('encodes unicode characters inside segments', () => {
    expect(encodeS3Key('über/café.txt')).toBe(
      `${encodeURIComponent('über')}/${encodeURIComponent('café.txt')}`,
    )
  })

  test('keeps empty / root correctly', () => {
    expect(encodeS3Key('readme.txt')).toBe('readme.txt')
  })
})

describe('AUTHORIZATION', () => {
  test('uses SigV4 shape with s3 service scope', () => {
    expect(AUTHORIZATION).toContain('AWS4-HMAC-SHA256')
    expect(AUTHORIZATION).toContain('/s3/aws4_request')
  })
})

describe('s3Get', () => {
  test('appends path-style URL against window origin and returns body text', async () => {
    let capturedAuth = ''
    mswServer.use(
      http.get('*/my-bucket', ({ request }) => {
        capturedAuth = request.headers.get('authorization') ?? ''
        return new HttpResponse('<ok/>', {
          status: 200,
          headers: { 'Content-Type': 'application/xml' },
        })
      }),
    )

    const body = await s3Get('/my-bucket')
    expect(body).toBe('<ok/>')
    expect(capturedAuth).toBe(AUTHORIZATION)
  })

  test('forwards searchParams to the URL', async () => {
    let capturedUrl = ''
    mswServer.use(
      http.get('*/my-bucket', ({ request }) => {
        capturedUrl = request.url
        return new HttpResponse('<ok/>', { status: 200 })
      }),
    )

    await s3Get('/my-bucket', { 'list-type': '2', delimiter: '/' })
    expect(capturedUrl).toContain('list-type=2')
    expect(capturedUrl).toContain('delimiter=%2F')
  })
})

describe('s3Put', () => {
  test('attaches dummy Authorization header', async () => {
    let captured = ''
    mswServer.use(
      http.put('*/my-bucket/file.txt', ({ request }) => {
        captured = request.headers.get('authorization') ?? ''
        return new HttpResponse(null, { status: 200 })
      }),
    )

    await s3Put('/my-bucket/file.txt', 'payload')
    expect(captured).toBe(AUTHORIZATION)
  })

  test('forwards custom headers alongside Authorization', async () => {
    let contentType = ''
    mswServer.use(
      http.put('*/my-bucket/file.txt', ({ request }) => {
        contentType = request.headers.get('content-type') ?? ''
        return new HttpResponse(null, { status: 200 })
      }),
    )

    await s3Put('/my-bucket/file.txt', 'payload', {
      'Content-Type': 'text/plain',
    })
    expect(contentType).toBe('text/plain')
  })
})

describe('s3Delete', () => {
  test('issues DELETE and supports searchParams for ?tagging, ?delete-style queries', async () => {
    let method = ''
    let url = ''
    mswServer.use(
      http.delete('*/my-bucket/file.txt', ({ request }) => {
        method = request.method
        url = request.url
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await s3Delete('/my-bucket/file.txt', { tagging: '' })
    expect(method).toBe('DELETE')
    expect(url).toContain('tagging=')
  })
})

describe('s3PostDelete', () => {
  test('posts XML body to ?delete endpoint with application/xml content-type', async () => {
    let bodyText = ''
    let contentType = ''
    let url = ''
    mswServer.use(
      http.post('*/my-bucket', async ({ request }) => {
        bodyText = await request.text()
        contentType = request.headers.get('content-type') ?? ''
        url = request.url
        return new HttpResponse('<DeleteResult/>', { status: 200 })
      }),
    )

    const xml = '<Delete><Object><Key>a</Key></Object></Delete>'
    const res = await s3PostDelete('/my-bucket', xml)
    expect(res).toBe('<DeleteResult/>')
    expect(bodyText).toBe(xml)
    expect(contentType).toContain('application/xml')
    expect(url).toContain('delete=')
  })
})
