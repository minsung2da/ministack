/**
 * parseSqsAttributes — converts the string-valued Attributes object returned
 * by GetQueueAttributes (§2.3 "all values are strings") into a typed
 * SqsQueueAttributes with numeric counts and Date timestamps.
 *
 * Keeps the raw map so the Configuration tab can render unknown keys
 * (FifoQueue, KmsMasterKeyId, …) without extending the typed shape.
 *
 * Inputs are untrusted emulator output: malformed numbers fall back to a
 * sensible default (T-5-03-04) rather than throwing.
 */

import type {
  SqsQueueAttributes,
  SqsRawAttributes,
} from '../../../shared/types/sqs'

export const COUNT_KEYS = [
  'ApproximateNumberOfMessages',
  'ApproximateNumberOfMessagesNotVisible',
  'ApproximateNumberOfMessagesDelayed',
  'VisibilityTimeout',
  'MaximumMessageSize',
  'MessageRetentionPeriod',
  'DelaySeconds',
  'ReceiveMessageWaitTimeSeconds',
] as const

export const TIMESTAMP_KEYS = [
  'CreatedTimestamp',
  'LastModifiedTimestamp',
] as const

function toNumber(
  raw: SqsRawAttributes,
  key: string,
  fallback: number,
): number {
  const v = raw[key]
  if (v === undefined) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function toDate(raw: SqsRawAttributes, key: string): Date {
  const v = raw[key]
  if (v === undefined) return new Date() // harmless UI default
  // §2.3: CreatedTimestamp is epoch SECONDS as a string.
  const n = Number(v)
  if (!Number.isFinite(n)) return new Date()
  return new Date(n * 1000)
}

export function parseSqsAttributes(
  raw: SqsRawAttributes,
): SqsQueueAttributes {
  return {
    QueueArn: raw.QueueArn ?? '',
    CreatedTimestamp: toDate(raw, 'CreatedTimestamp'),
    ApproximateNumberOfMessages: toNumber(
      raw,
      'ApproximateNumberOfMessages',
      0,
    ),
    ApproximateNumberOfMessagesNotVisible: toNumber(
      raw,
      'ApproximateNumberOfMessagesNotVisible',
      0,
    ),
    ApproximateNumberOfMessagesDelayed: toNumber(
      raw,
      'ApproximateNumberOfMessagesDelayed',
      0,
    ),
    VisibilityTimeout: toNumber(raw, 'VisibilityTimeout', 30),
    MaximumMessageSize: toNumber(raw, 'MaximumMessageSize', 262144),
    MessageRetentionPeriod: toNumber(raw, 'MessageRetentionPeriod', 345600),
    DelaySeconds:
      raw.DelaySeconds !== undefined
        ? toNumber(raw, 'DelaySeconds', 0)
        : undefined,
    ReceiveMessageWaitTimeSeconds:
      raw.ReceiveMessageWaitTimeSeconds !== undefined
        ? toNumber(raw, 'ReceiveMessageWaitTimeSeconds', 0)
        : undefined,
    // Preserve for the Configuration tab's unknown-key rendering.
    raw,
  }
}
