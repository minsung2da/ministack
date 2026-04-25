/**
 * GenericListPage — D-02 conditional-mutation-controls invariants (source-level).
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync(
  path.resolve(__dirname, 'GenericListPage.tsx'),
  'utf-8',
)

describe('_generic/GenericListPage (D-02 source invariants)', () => {
  it('Create button rendered only when descriptor.mutations.create is declared', () => {
    expect(src).toMatch(/hasCreate/)
    expect(src).toMatch(/descriptor\.mutations\?\.create/)
  })

  it('Delete dropdown rendered only when descriptor.mutations.delete is declared', () => {
    expect(src).toMatch(/hasDelete/)
    expect(src).toMatch(/descriptor\.mutations\?\.delete/)
  })

  it('uses buildColumns to derive Cloudscape column defs', () => {
    expect(src).toMatch(/buildColumns\(descriptor\.list\.columns\)/)
  })
})
