import { describe, it, expect } from 'vitest'
import { sqsKeys } from './sqsKeys'

describe('sqs/api/sqsKeys', () => {
  it('all returns [sqs]', () => {
    expect(sqsKeys.all).toEqual(['sqs'])
  })

  it('queues() with no prefix returns [sqs, queues, null]', () => {
    expect(sqsKeys.queues()).toEqual(['sqs', 'queues', null])
  })

  it('queues(prefix) returns [sqs, queues, prefix]', () => {
    expect(sqsKeys.queues('dev-')).toEqual(['sqs', 'queues', 'dev-'])
  })

  it('queue(url) returns [sqs, queue, url]', () => {
    const url = 'http://localhost:4566/000000000000/dev-orders'
    expect(sqsKeys.queue(url)).toEqual(['sqs', 'queue', url])
  })

  it('attributes(url) returns [sqs, attributes, url]', () => {
    const url = 'http://localhost:4566/000000000000/dev-orders'
    expect(sqsKeys.attributes(url)).toEqual(['sqs', 'attributes', url])
  })

  it('does NOT expose a messages key (D-04 — messages live in Zustand)', () => {
    // Runtime assertion: no 'messages' property on sqsKeys.
    expect(
      Object.prototype.hasOwnProperty.call(sqsKeys, 'messages'),
    ).toBe(false)
  })
})
