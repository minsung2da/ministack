/**
 * GenericCreateModal — D-07 preview/send same-input invariants (source-level).
 * Pitfall 7.2.6: preview(input) and send(input) must be called with the same
 * coerced input object. The hook-level test in Plan 04 verifies byte-equality.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync(
  path.resolve(__dirname, 'GenericCreateModal.tsx'),
  'utf-8',
)

describe('_generic/GenericCreateModal (D-07 source invariants)', () => {
  it('calls preview(inputForRequest) (Pitfall 7.2.6)', () => {
    expect(src).toMatch(/preview\(inputForRequest\)/)
  })

  it('calls sendAsync(inputForRequest) with the same input (Pitfall 7.2.6)', () => {
    expect(src).toMatch(/sendAsync\(inputForRequest\)/)
  })

  it('opens GenericDiffPreviewModal on Review click', () => {
    expect(src).toMatch(/GenericDiffPreviewModal/)
    expect(src).toMatch(/setDiffOpen\(true\)/)
  })

  it('uses reviewButton copy token', () => {
    expect(src).toMatch(/reviewButton/)
  })
})
