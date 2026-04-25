/**
 * SendMessageModal — D-10 wire-format assertion.
 *
 * Guards against accidental regression to Query-style flattening
 * (e.g. MessageAttribute.1.Name / MessageAttribute.1.Value.StringValue).
 * The module source MUST NOT use URLSearchParams or form-encoded naming.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('sqs/SendMessageModal (D-10 JSON-wire invariants)', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, 'SendMessageModal.tsx'),
    'utf-8',
  )

  it('does not use URLSearchParams (D-10)', () => {
    expect(src).not.toMatch(/URLSearchParams/)
  })

  it('does not flatten MessageAttribute.1.Name (Pitfall 7.2.3)', () => {
    expect(src).not.toMatch(/MessageAttribute\.\d/)
  })

  it('builds nested MessageAttributes object (D-10)', () => {
    expect(src).toMatch(/MessageAttributes/)
    expect(src).toMatch(/DataType/)
    expect(src).toMatch(/StringValue/)
  })
})
