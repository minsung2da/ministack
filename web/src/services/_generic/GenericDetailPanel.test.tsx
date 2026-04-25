/**
 * GenericDetailPanel — D-08 mask+Reveal invariants (source-level).
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync(
  path.resolve(__dirname, 'GenericDetailPanel.tsx'),
  'utf-8',
)

describe('_generic/GenericDetailPanel (D-08 source invariants)', () => {
  it('references descriptor.detail.maskFields', () => {
    expect(src).toMatch(/maskFields/)
  })

  it('uses bullet placeholder for masked values', () => {
    expect(src).toMatch(/••••••••/)
  })

  it('wires Reveal / Hide copy tokens', () => {
    expect(src).toMatch(/copy\.generic\.reveal/)
    expect(src).toMatch(/copy\.generic\.hide/)
  })
})
