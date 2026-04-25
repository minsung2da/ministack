/**
 * GenericDeleteModal — D-07 + type-to-confirm invariants (source-level).
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync(
  path.resolve(__dirname, 'GenericDeleteModal.tsx'),
  'utf-8',
)

describe('_generic/GenericDeleteModal (D-07 source invariants)', () => {
  it('calls preview(input) (Pitfall 7.2.6)', () => {
    expect(src).toMatch(/preview\(input\)/)
  })

  it('calls sendAsync(input) with the same input (Pitfall 7.2.6)', () => {
    expect(src).toMatch(/sendAsync\(input\)/)
  })

  it('opens GenericDiffPreviewModal on Review click', () => {
    expect(src).toMatch(/GenericDiffPreviewModal/)
  })

  it('uses typeToConfirmField for the type-to-confirm gate', () => {
    expect(src).toMatch(/typeToConfirmField/)
  })
})
