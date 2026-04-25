/**
 * Sample payload templates for the Test tab payload dropdown.
 * Templates come verbatim from 04-RESEARCH.md §Sample Payload Templates.
 *
 * Each `value` MUST be a valid JSON string (pretty-printed, 2-space indent).
 */

export type SamplePayload = { label: string; value: string }

const EMPTY = '{}'

const API_GATEWAY_V2 = JSON.stringify(
  {
    version: '2.0',
    routeKey: 'GET /hello',
    rawPath: '/hello',
    rawQueryString: 'name=world',
    headers: { accept: '*/*', 'content-type': 'application/json' },
    queryStringParameters: { name: 'world' },
    requestContext: {
      accountId: '000000000000',
      apiId: 'api123',
      domainName: 'api123.execute-api.us-east-1.amazonaws.com',
      http: {
        method: 'GET',
        path: '/hello',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'curl/8',
      },
      requestId: 'id',
      routeKey: 'GET /hello',
      stage: '$default',
      time: '17/Apr/2026:10:00:00 +0000',
      timeEpoch: 1713346800000,
    },
    isBase64Encoded: false,
  },
  null,
  2,
)

const S3_PUT = JSON.stringify(
  {
    Records: [
      {
        eventVersion: '2.1',
        eventSource: 'aws:s3',
        awsRegion: 'us-east-1',
        eventTime: '2026-04-17T10:00:00.000Z',
        eventName: 'ObjectCreated:Put',
        s3: {
          s3SchemaVersion: '1.0',
          configurationId: 'test',
          bucket: { name: 'my-bucket', arn: 'arn:aws:s3:::my-bucket' },
          object: { key: 'hello.txt', size: 12, eTag: 'abc' },
        },
      },
    ],
  },
  null,
  2,
)

const SQS_BATCH = JSON.stringify(
  {
    Records: [
      {
        messageId: 'id-1',
        receiptHandle: 'AQEB...',
        body: 'hello from sqs',
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: '1713346800000',
          SenderId: 'sender',
          ApproximateFirstReceiveTimestamp: '1713346800000',
        },
        messageAttributes: {},
        md5OfBody: '0a6e...',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:000000000000:my-queue',
        awsRegion: 'us-east-1',
      },
    ],
  },
  null,
  2,
)

export const SAMPLE_PAYLOADS: SamplePayload[] = [
  { label: 'Empty ({})', value: EMPTY },
  { label: 'API Gateway v2 HTTP', value: API_GATEWAY_V2 },
  { label: 'S3 ObjectCreated:Put', value: S3_PUT },
  { label: 'SQS batch message', value: SQS_BATCH },
]
