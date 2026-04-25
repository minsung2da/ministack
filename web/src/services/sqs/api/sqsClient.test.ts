import { describe, it, expect, beforeEach } from 'vitest'
import { http } from 'msw'
import { mswServer } from '../../../test/msw'
import { setupMswForTest } from '../../../test/msw-setup'
import { sqsHandlers } from '../__tests__/msw-handlers'
import { SQS_FIXTURES } from '../../../test/fixtures/sqs'
import { AUTHORIZATION_SQS, sqsJsonCall } from './sqsClient'

setupMswForTest()

type Captured = {
  method: string
  headers: Record<string, string>
  body: string
}

const captured: { last: Captured | null } = { last: null }

function captureOnce(): void {
  // Install a pre-handler that captures the request, then falls through to sqsHandlers
  // by re-issuing response behavior via the SQS dispatch. Simpler: wrap sqs handler.
  mswServer.use(
    http.post('*/', async ({ request }) => {
      const clone = request.clone()
      const body = await clone.text()
      const headers: Record<string, string> = {}
      request.headers.forEach((v, k) => {
        headers[k] = v
      })
      captured.last = { method: request.method, headers, body }
      // Delegate to sqsHandlers default by returning undefined (MSW will try next handler)
      return undefined
    }),
    ...sqsHandlers,
  )
}

beforeEach(() => {
  captured.last = null
  captureOnce()
})

describe('sqs/api/sqsClient', () => {
  it('sqsJsonCall POSTs to / with X-Amz-Target AmazonSQS.ListQueues (D-10)', async () => {
    const res = await sqsJsonCall<typeof SQS_FIXTURES.listQueues>(
      'ListQueues',
      {},
    )
    expect(res).toEqual(SQS_FIXTURES.listQueues)
    expect(captured.last?.method).toBe('POST')
    expect(captured.last?.headers['x-amz-target']).toBe('AmazonSQS.ListQueues')
  })

  it('sends Content-Type application/x-amz-json-1.0 (D-10)', async () => {
    await sqsJsonCall('ListQueues', {})
    expect(captured.last?.headers['content-type']).toContain(
      'application/x-amz-json-1.0',
    )
  })

  it('body is valid JSON — NOT URLSearchParams (Pitfall 7.2.3 regression-lock)', async () => {
    await sqsJsonCall('SendMessage', {
      QueueUrl: 'http://localhost:4566/000000000000/dev-orders',
      MessageBody: 'hello',
      MessageAttributes: {
        'trace-id': { DataType: 'String', StringValue: 'abc-123' },
      },
    })
    // Must parse as JSON — throws if form-encoded.
    const parsed = JSON.parse(captured.last?.body ?? '') as {
      MessageAttributes: Record<string, unknown>
      MessageBody: string
    }
    expect(parsed.MessageBody).toBe('hello')
    // Flattened form-encoding would produce keys like 'MessageAttribute.1.Name'.
    // Here we assert MessageAttributes remains a plain nested object.
    expect(parsed.MessageAttributes).toEqual({
      'trace-id': { DataType: 'String', StringValue: 'abc-123' },
    })
  })

  it('Authorization header equals AUTHORIZATION_SQS (scope: sqs)', async () => {
    await sqsJsonCall('ListQueues', {})
    expect(captured.last?.headers['authorization']).toBe(AUTHORIZATION_SQS)
    expect(AUTHORIZATION_SQS).toContain('us-east-1/sqs/aws4_request')
  })

  it('throws with action name and status on non-2xx response', async () => {
    mswServer.use(
      http.post('*/', () => new Response('boom', { status: 500 })),
    )
    await expect(sqsJsonCall('ListQueues', {})).rejects.toThrow(
      /SQS ListQueues failed 500/,
    )
  })
})
