/**
 * MSW handlers for SQS AWS-JSON (Phase 5 Wave 0).
 *
 * D-10: SQS uses the JSON wire protocol (same pattern as DDB).
 * Dispatch key: X-Amz-Target header 'AmazonSQS.{Action}'. Body is JSON —
 * the legacy Query discriminator is not parsed here.
 */

import { http, HttpResponse, type HttpHandler } from 'msw'
import { SQS_FIXTURES } from '../../../test/fixtures/sqs'

const SQS_PREFIX = 'AmazonSQS.'

function sqsDispatch(target: string): unknown | null {
  const action = target.slice(SQS_PREFIX.length)
  switch (action) {
    case 'ListQueues':
      return SQS_FIXTURES.listQueues
    case 'GetQueueAttributes':
      return SQS_FIXTURES.getQueueAttributes
    case 'GetQueueUrl':
      return SQS_FIXTURES.getQueueUrl
    case 'CreateQueue':
      return SQS_FIXTURES.createQueue
    case 'SendMessage':
      return SQS_FIXTURES.sendMessage
    case 'ReceiveMessage':
      return SQS_FIXTURES.receiveMessagesOne
    case 'DeleteMessage':
      return SQS_FIXTURES.deleteMessage
    case 'PurgeQueue':
      return SQS_FIXTURES.purgeQueue
    case 'DeleteQueue':
      return SQS_FIXTURES.deleteQueue
    default:
      return null
  }
}

export const sqsHandlers: HttpHandler[] = [
  http.post('*/', ({ request }) => {
    const target = request.headers.get('x-amz-target') ?? ''
    if (!target.startsWith(SQS_PREFIX)) return
    const body = sqsDispatch(target)
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
