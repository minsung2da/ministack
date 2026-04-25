import { describe, it, expect } from 'vitest'
import { buildColumns } from './components/columnBuilders'
import type { ColumnDefinition } from './types'

describe('_generic/columnBuilders', () => {
  it('maps descriptor columns to Cloudscape column defs preserving id/header/sortingField/cell', () => {
    type R = { name: string }
    const defs: ColumnDefinition<R>[] = [
      { id: 'name', header: 'Name', sortingField: 'name', cell: (r) => r.name },
      { id: 'misc', header: 'Misc', cell: () => 'x' },
    ]
    const built = buildColumns<R>(defs)
    expect(built).toHaveLength(2)
    expect(built[0]?.id).toBe('name')
    expect(built[0]?.header).toBe('Name')
    expect(built[0]?.sortingField).toBe('name')
    expect(typeof built[0]?.cell).toBe('function')
  })
})
