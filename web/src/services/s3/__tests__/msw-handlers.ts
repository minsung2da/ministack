import { http, HttpResponse, type HttpHandler } from 'msw'
import { S3_FIXTURES } from './fixtures'

/**
 * MSW handlers for S3 REST API (path-style URLs).
 *
 * Covered endpoints:
 * - GET /                         ListBuckets
 * - GET /{bucket}?list-type=2     ListObjectsV2 (prefix-aware)
 * - PUT /{bucket}                 CreateBucket
 * - DELETE /{bucket}              DeleteBucket (409 on "not-empty")
 * - PUT /{bucket}/{key}           PutObject
 * - GET /{bucket}/{key}           GetObject
 * - HEAD /{bucket}/{key}          HeadObject (incl. x-amz-meta-*)
 * - GET /{bucket}/{key}?tagging   GetObjectTagging
 * - DELETE /{bucket}/{key}        DeleteObject
 * - POST /{bucket}?delete         DeleteObjects
 *
 * Usage: mswServer.use(...s3Handlers)
 */
export const s3Handlers: HttpHandler[] = [
  // ListBuckets — GET / (no list-type param)
  http.get('*/', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.has('list-type')) {
      return undefined
    }
    return HttpResponse.xml(S3_FIXTURES.listBucketsTwo)
  }),

  // ListObjectsV2 — GET /{bucket}?list-type=2
  http.get('*/:bucket', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('list-type') !== '2') {
      return undefined
    }
    const prefix = url.searchParams.get('prefix') ?? ''
    if (prefix === 'photos/') {
      return HttpResponse.xml(S3_FIXTURES.listObjectsNested)
    }
    return HttpResponse.xml(S3_FIXTURES.listObjectsRoot)
  }),

  // DeleteObjects — POST /{bucket}?delete
  http.post('*/:bucket', ({ request }) => {
    const url = new URL(request.url)
    if (!url.searchParams.has('delete')) {
      return undefined
    }
    return HttpResponse.xml(S3_FIXTURES.deleteObjectsSuccess)
  }),

  // CreateBucket — PUT /{bucket}
  http.put('*/:bucket', () => {
    return new HttpResponse(null, { status: 200 })
  }),

  // DeleteBucket — DELETE /{bucket}
  http.delete('*/:bucket', ({ params }) => {
    const bucket = params.bucket as string
    if (bucket === 'not-empty') {
      return new HttpResponse(
        `<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>BucketNotEmpty</Code><Message>Bucket not empty</Message></Error>`,
        {
          status: 409,
          headers: { 'Content-Type': 'application/xml' },
        },
      )
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // PutObject — PUT /{bucket}/{key...}
  http.put('*/:bucket/*', () => {
    return new HttpResponse(null, {
      status: 200,
      headers: { ETag: '"etag-123"' },
    })
  }),

  // GetObjectTagging — GET /{bucket}/{key}?tagging
  // GetObject — GET /{bucket}/{key}
  http.get('*/:bucket/*', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.has('tagging')) {
      return HttpResponse.xml(S3_FIXTURES.taggingWithTags)
    }
    const body = new Blob(['data'], { type: 'application/octet-stream' })
    return new HttpResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': '4',
      },
    })
  }),

  // HeadObject — HEAD /{bucket}/{key}
  http.head('*/:bucket/*', () => {
    return new HttpResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': '1234567',
        ETag: '"abc123"',
        'Last-Modified': 'Mon, 12 Apr 2026 10:30:00 GMT',
        'x-amz-meta-author': 'alice',
        'x-amz-meta-project': 'demo',
      },
    })
  }),

  // DeleteObject — DELETE /{bucket}/{key}
  http.delete('*/:bucket/*', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
