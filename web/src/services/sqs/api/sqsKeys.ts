/**
 * TanStack Query key factory for SQS (Plan 05-03, RESEARCH §6).
 *
 * D-04: Messages are NOT queried — they accumulate in Zustand messageStore
 * (uiStore.sqsMessages[url]: SqsMessage[]). Adding a 'messages' key here
 * would introduce a second source of truth. See useReceiveMessage (later plan).
 */

export const sqsKeys = {
  all: ['sqs'] as const,
  queues: (prefix?: string) => ['sqs', 'queues', prefix ?? null] as const,
  queue: (url: string) => ['sqs', 'queue', url] as const,
  attributes: (url: string) => ['sqs', 'attributes', url] as const,
  // D-04: intentionally NO `messages` key — see file header.
} as const
