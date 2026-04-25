/**
 * SQS (Phase 5) domain types.
 *
 * Split into its own file under shared/types/ (plan 05-03 frontmatter
 * files_modified) to keep the growing shared/types.ts legible while the
 * Lambda/S3/EC2 types still live in the legacy flat file for backward compat.
 *
 * Re-exported from shared/types.ts so existing `from '../../../shared/types'`
 * import sites can also reach these names without churn.
 */

// ---------- SQS (Phase 5) ----------

export type SqsQueueSummary = { QueueUrl: string }

// The RAW wire shape from GetQueueAttributes — every value is a string per §2.3.
export type SqsRawAttributes = Record<string, string>

// The PARSED shape used by the UI — counts coerced to numbers, timestamps to Date.
// parseSqsAttributes (Task 2) produces this from SqsRawAttributes.
export type SqsQueueAttributes = {
  QueueArn: string
  CreatedTimestamp: Date
  ApproximateNumberOfMessages: number
  ApproximateNumberOfMessagesNotVisible: number
  ApproximateNumberOfMessagesDelayed: number
  VisibilityTimeout: number
  MaximumMessageSize: number
  MessageRetentionPeriod: number
  DelaySeconds?: number
  ReceiveMessageWaitTimeSeconds?: number
  // Preserve unknown keys as strings so the Configuration tab can render them.
  raw: SqsRawAttributes
}

export type SqsMessageAttribute = {
  // AWS also allows custom subtypes like 'String.x' — keep the union open.
  DataType: 'String' | 'Number' | 'Binary' | string
  StringValue?: string
  BinaryValue?: string // base64
}

export type SqsMessage = {
  MessageId: string
  // Pitfall 7.2.4: ReceiptHandle in MiniStack is a bare UUID; in real AWS it may
  // contain '+', '/', '='. Client stores verbatim; only encode if embedding in URL
  // (Phase 5 never does — DeleteMessage sends it in a JSON body).
  ReceiptHandle: string
  MD5OfBody: string
  Body: string
  Attributes?: Record<string, string> // SenderId, SentTimestamp, ...
  MessageAttributes?: Record<string, SqsMessageAttribute> // user-defined attrs
  MD5OfMessageAttributes?: string
  // UI-only fields (added by useReceiveMessage as it accumulates):
  ReceivedAt?: Date // timestamp of the poll that returned this message
}
