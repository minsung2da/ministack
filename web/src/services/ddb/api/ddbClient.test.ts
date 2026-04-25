import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { ddbHandlers } from '../__tests__/msw-handlers'
import { DDB_FIXTURES } from '../../../test/fixtures/ddb'
import { ddbJsonCall, AUTHORIZATION_DDB } from './ddbClient'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

describe('AUTHORIZATION_DDB', () => {
  test('uses SigV4 shape with dynamodb service scope', () => {
    expect(AUTHORIZATION_DDB).toContain('AWS4-HMAC-SHA256')
    expect(AUTHORIZATION_DDB).toContain('/dynamodb/aws4_request')
  })
})

describe('ddbJsonCall', () => {
  test('POSTs to / with X-Amz-Target: DynamoDB_20120810.{action} and returns parsed JSON body', async () => {
    mswServer.use(...ddbHandlers)

    const result = await ddbJsonCall<typeof DDB_FIXTURES.listTables>(
      'ListTables',
      {},
    )
    expect(result).toEqual(DDB_FIXTURES.listTables)
  })

  test('sets Content-Type application/x-amz-json-1.0 and X-Amz-Target and Authorization headers', async () => {
    let capturedTarget = ''
    let capturedContentType = ''
    let capturedAuth = ''
    mswServer.use(
      http.post('*/', ({ request }) => {
        capturedTarget = request.headers.get('x-amz-target') ?? ''
        capturedContentType = request.headers.get('content-type') ?? ''
        capturedAuth = request.headers.get('authorization') ?? ''
        return HttpResponse.json({ TableNames: [] })
      }),
    )

    await ddbJsonCall('ListTables', {})

    expect(capturedContentType).toBe('application/x-amz-json-1.0')
    expect(capturedTarget).toBe('DynamoDB_20120810.ListTables')
    expect(capturedAuth).toBe(AUTHORIZATION_DDB)
  })

  test('throws a descriptive error for non-2xx responses including the backend body', async () => {
    mswServer.use(...ddbHandlers)

    await expect(ddbJsonCall('UnknownAction', {})).rejects.toThrow(
      /DynamoDB UnknownAction failed 400/,
    )
  })
})
