/**
 * SQS AWS-JSON fixtures (Phase 5 Wave 0) — D-10 chooses JSON, NOT Query.
 *
 * Sourced verbatim from 05-RESEARCH.md §9.5–§9.7 where applicable.
 *
 * Protocol notes:
 * - Backend dispatches by X-Amz-Target header 'AmazonSQS.{Action}'.
 * - Attribute values are always STRINGS on the wire (§2.3).
 * - Empty receive returns {} with NO Messages key (§2.6 line 366).
 */

export const SQS_FIXTURES = {
  // ListQueues (§9.5)
  listQueues: {
    QueueUrls: [
      'http://localhost:4566/000000000000/dev-orders',
      'http://localhost:4566/000000000000/dev-events',
    ],
  },
  listQueuesEmpty: { QueueUrls: [] as string[] },

  // GetQueueAttributes (§9.6) — all counts string-encoded
  getQueueAttributes: {
    Attributes: {
      QueueArn: 'arn:aws:sqs:us-east-1:000000000000:dev-orders',
      CreatedTimestamp: '1713350000',
      ApproximateNumberOfMessages: '5',
      ApproximateNumberOfMessagesNotVisible: '1',
      ApproximateNumberOfMessagesDelayed: '0',
      VisibilityTimeout: '30',
      MaximumMessageSize: '262144',
      MessageRetentionPeriod: '345600',
    },
  },

  getQueueUrl: {
    QueueUrl: 'http://localhost:4566/000000000000/dev-orders',
  },

  createQueue: {
    QueueUrl: 'http://localhost:4566/000000000000/dev-new',
  },

  sendMessage: {
    MessageId: '11111111-1111-1111-1111-111111111111',
    MD5OfMessageBody: '5d41402abc4b2a76b9719d911017c592',
    MD5OfMessageAttributes: 'deadbeef',
  },

  // ReceiveMessage (§9.7) — 1 message with attributes
  receiveMessagesOne: {
    Messages: [
      {
        MessageId: '22222222-2222-2222-2222-222222222222',
        ReceiptHandle: '33333333-3333-3333-3333-333333333333',
        MD5OfBody: '5d41402abc4b2a76b9719d911017c592',
        Body: 'hello',
        Attributes: {
          SenderId: '000000000000',
          SentTimestamp: '1713350000000',
        },
        MessageAttributes: {
          'trace-id': { DataType: 'String', StringValue: 'abc-123' },
        },
        MD5OfMessageAttributes: 'deadbeef',
      },
    ],
  },

  // Empty poll — NO Messages key (§2.6)
  receiveMessagesEmpty: {} as Record<string, unknown>,

  deleteMessage: {} as Record<string, unknown>,
  purgeQueue: {} as Record<string, unknown>,
  deleteQueue: {} as Record<string, unknown>,
} as const
