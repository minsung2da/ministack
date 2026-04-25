import { describe, it, expect } from 'vitest'
import { SQS_FIXTURES } from '../../../test/fixtures/sqs'
import {
  COUNT_KEYS,
  TIMESTAMP_KEYS,
  parseSqsAttributes,
} from './parseSqsAttributes'

describe('sqs/api/parseSqsAttributes', () => {
  it('coerces string-valued counts to numbers (§2.3)', () => {
    const parsed = parseSqsAttributes(SQS_FIXTURES.getQueueAttributes.Attributes)
    expect(parsed.ApproximateNumberOfMessages).toBe(5)
    expect(typeof parsed.ApproximateNumberOfMessages).toBe('number')
    expect(parsed.VisibilityTimeout).toBe(30)
    expect(parsed.MessageRetentionPeriod).toBe(345600)
    expect(parsed.MaximumMessageSize).toBe(262144)
    expect(parsed.ApproximateNumberOfMessagesNotVisible).toBe(1)
    expect(parsed.ApproximateNumberOfMessagesDelayed).toBe(0)
  })

  it('coerces CreatedTimestamp (epoch seconds string) to Date', () => {
    const parsed = parseSqsAttributes(SQS_FIXTURES.getQueueAttributes.Attributes)
    expect(parsed.CreatedTimestamp).toBeInstanceOf(Date)
    expect(parsed.CreatedTimestamp.getTime()).toBe(1713350000 * 1000)
  })

  it('passes QueueArn through as a string', () => {
    const parsed = parseSqsAttributes(SQS_FIXTURES.getQueueAttributes.Attributes)
    expect(parsed.QueueArn).toBe(
      'arn:aws:sqs:us-east-1:000000000000:dev-orders',
    )
  })

  it('preserves raw input verbatim for Configuration tab rendering', () => {
    const raw = SQS_FIXTURES.getQueueAttributes.Attributes
    const parsed = parseSqsAttributes(raw)
    expect(parsed.raw).toBe(raw)
    // Unknown keys survive as strings if present on raw.
    const rawExtra = { ...raw, CustomKey: 'foo' }
    const parsedExtra = parseSqsAttributes(rawExtra)
    expect(parsedExtra.raw.CustomKey).toBe('foo')
  })

  it('returns defaults when fed an empty object', () => {
    const parsed = parseSqsAttributes({})
    expect(parsed.QueueArn).toBe('')
    expect(parsed.ApproximateNumberOfMessages).toBe(0)
    expect(parsed.VisibilityTimeout).toBe(30)
    expect(parsed.MessageRetentionPeriod).toBe(345600)
    expect(parsed.MaximumMessageSize).toBe(262144)
    expect(parsed.CreatedTimestamp).toBeInstanceOf(Date)
    expect(parsed.DelaySeconds).toBeUndefined()
    expect(parsed.ReceiveMessageWaitTimeSeconds).toBeUndefined()
  })

  it('falls back to 0 on malformed numeric string without throwing', () => {
    const parsed = parseSqsAttributes({
      ApproximateNumberOfMessages: 'not-a-number',
    })
    expect(parsed.ApproximateNumberOfMessages).toBe(0)
  })

  it('falls back to current Date on malformed CreatedTimestamp', () => {
    const before = Date.now()
    const parsed = parseSqsAttributes({ CreatedTimestamp: 'nope' })
    const after = Date.now()
    const t = parsed.CreatedTimestamp.getTime()
    expect(t).toBeGreaterThanOrEqual(before)
    expect(t).toBeLessThanOrEqual(after + 1)
  })

  it('includes DelaySeconds and ReceiveMessageWaitTimeSeconds when raw provides them', () => {
    const parsed = parseSqsAttributes({
      DelaySeconds: '15',
      ReceiveMessageWaitTimeSeconds: '20',
    })
    expect(parsed.DelaySeconds).toBe(15)
    expect(parsed.ReceiveMessageWaitTimeSeconds).toBe(20)
  })

  it('COUNT_KEYS and TIMESTAMP_KEYS are stable, enumerable lists', () => {
    expect(COUNT_KEYS).toHaveLength(8)
    expect(TIMESTAMP_KEYS).toHaveLength(2)
    expect(COUNT_KEYS).toContain('ApproximateNumberOfMessages')
    expect(TIMESTAMP_KEYS).toContain('CreatedTimestamp')
  })
})
