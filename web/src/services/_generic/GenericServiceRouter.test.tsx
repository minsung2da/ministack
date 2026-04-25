/**
 * GenericRouter — Pitfall 7.2.7 singleton dispatch invariant (source-level).
 *
 * Full rendered-behavior tests are covered by the integration test suite;
 * here we lock the structural invariants a refactor must preserve.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync(
  path.resolve(__dirname, 'GenericRouter.tsx'),
  'utf-8',
)

describe('_generic/GenericRouter (Pitfall 7.2.7 + source invariants)', () => {
  it('looks up descriptor in GENERIC_DESCRIPTORS by serviceKey', () => {
    expect(src).toMatch(/GENERIC_DESCRIPTORS\[serviceKey\]/)
  })

  it("dispatches to GenericDetailPanel when kind === 'singleton' (STS)", () => {
    expect(src).toMatch(/descriptor\.kind === 'singleton'/)
    expect(src).toMatch(/GenericDetailPanel/)
  })

  it('renders an Alert for unknown serviceKey', () => {
    expect(src).toMatch(/Alert/)
    expect(src).toMatch(/unknownService/)
  })

  it('renders GenericListPage for list descriptors without id', () => {
    expect(src).toMatch(/GenericListPage/)
  })
})
