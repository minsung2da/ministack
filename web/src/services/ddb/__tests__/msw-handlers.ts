/**
 * MSW handlers for DynamoDB AWS-JSON (Phase 5 Wave 0).
 *
 * Dispatch key: X-Amz-Target header 'DynamoDB_20120810.{Action}'.
 * All DDB requests hit POST / — the URL is NOT the discriminator. See §1 / §4.
 *
 * Returning `undefined` lets the next handler try, which is how DDB / SQS /
 * KMS / Secrets / SSM can coexist on the same URL.
 */

import { http, HttpResponse, type HttpHandler } from 'msw'
import { DDB_FIXTURES } from '../../../test/fixtures/ddb'

const DDB_PREFIX = 'DynamoDB_20120810.'

function ddbDispatch(target: string): unknown | null {
  const action = target.slice(DDB_PREFIX.length)
  switch (action) {
    case 'ListTables':
      return DDB_FIXTURES.listTables
    case 'DescribeTable':
      return DDB_FIXTURES.describeTableOrders
    case 'Scan':
      return DDB_FIXTURES.scanMixed
    case 'Query':
      return DDB_FIXTURES.queryResult
    case 'GetItem':
      return DDB_FIXTURES.getItem
    case 'PutItem':
      return DDB_FIXTURES.putItemNone
    case 'UpdateItem':
      return DDB_FIXTURES.updateItemAllNew
    case 'DeleteItem':
      return DDB_FIXTURES.deleteItem
    case 'CreateTable':
      return DDB_FIXTURES.createTableResponse
    case 'DeleteTable':
      return DDB_FIXTURES.deleteTableResponse
    default:
      return null
  }
}

export const ddbHandlers: HttpHandler[] = [
  http.post('*/', ({ request }) => {
    const target = request.headers.get('x-amz-target') ?? ''
    if (!target.startsWith(DDB_PREFIX)) return
    const body = ddbDispatch(target)
    if (body === null) {
      return HttpResponse.json(
        { __type: 'UnknownOperation' },
        { status: 400 },
      )
    }
    return HttpResponse.json(body, {
      headers: { 'Content-Type': 'application/x-amz-json-1.0' },
    })
  }),
]
