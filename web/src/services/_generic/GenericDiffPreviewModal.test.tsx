/**
 * GenericDiffPreviewModal — D-07 invariants (source-level).
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync(
  path.resolve(__dirname, 'GenericDiffPreviewModal.tsx'),
  'utf-8',
)

describe('_generic/GenericDiffPreviewModal (D-07 source invariants)', () => {
  it('renders at least 3 <pre> sections (url/headers/body)', () => {
    const matches = src.match(/<pre\b/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(3)
  })

  it('exposes url / headers / body copy tokens from generic namespace', () => {
    expect(src).toMatch(/diffUrlHeader/)
    expect(src).toMatch(/diffHeadersHeader/)
    expect(src).toMatch(/diffBodyHeader/)
  })

  it('includes Send / Cancel actions and onConfirm hook', () => {
    expect(src).toMatch(/sendButton/)
    expect(src).toMatch(/cancelButton/)
    expect(src).toMatch(/onConfirm/)
  })
})
