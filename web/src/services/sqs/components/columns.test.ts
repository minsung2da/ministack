import { describe, it, expect } from 'vitest'
import { QUEUE_COLUMNS, QUEUE_VISIBLE_CONTENT, MESSAGE_COLUMNS } from './columns'

describe('sqs/columns', () => {
  it('QUEUE_COLUMNS exposes name/available/inFlight columns', () => {
    const ids = QUEUE_COLUMNS.map((c) => c.id)
    expect(ids).toEqual(['name', 'available', 'inFlight'])
  })

  it('QUEUE_VISIBLE_CONTENT matches column ids', () => {
    expect(QUEUE_VISIBLE_CONTENT).toEqual(['name', 'available', 'inFlight'])
  })

  it('MESSAGE_COLUMNS exposes expected columns including Actions/Delete', () => {
    const cols = MESSAGE_COLUMNS(() => {})
    const ids = cols.map((c) => c.id)
    expect(ids).toContain('messageId')
    expect(ids).toContain('body')
    expect(ids).toContain('actions')
  })
})
