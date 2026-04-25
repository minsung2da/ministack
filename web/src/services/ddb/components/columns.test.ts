import { describe, test, expect } from 'vitest'
import { buildItemColumns, TABLE_COLUMNS, TABLE_VISIBLE_CONTENT } from './columns'
import type { DdbItem, DdbKeySchemaEntry } from '../../../shared/types/ddb'

describe('buildItemColumns [DDB-02]', () => {
  test('key-schema attributes come first with (key) suffix', () => {
    const keySchema: DdbKeySchemaEntry[] = [
      { AttributeName: 'pk', KeyType: 'HASH' },
    ]
    const cols = buildItemColumns(keySchema, ['pk', 'status'])
    expect(cols.map((c) => c.id)).toEqual(['pk', 'status'])
    expect(cols[0].header).toBe('pk (key)')
    expect(cols[1].header).toBe('status')
  })

  test('compound key preserves HASH/RANGE order; extras alpha-sorted', () => {
    const keySchema: DdbKeySchemaEntry[] = [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ]
    const cols = buildItemColumns(keySchema, ['total', 'pk', 'sk', 'paid'])
    expect(cols.map((c) => c.id)).toEqual(['pk', 'sk', 'paid', 'total'])
    expect(cols[0].header).toBe('pk (key)')
    expect(cols[1].header).toBe('sk (key)')
  })

  test('cell renders AttributeValue via renderAttributeValue', () => {
    const cols = buildItemColumns(
      [{ AttributeName: 'pk', KeyType: 'HASH' }],
      ['pk', 'total'],
    )
    const row: DdbItem = { pk: { S: 'c-1' }, total: { N: '42' } }
    const pkCell = cols[0].cell as (r: DdbItem) => string
    const totalCell = cols[1].cell as (r: DdbItem) => string
    expect(pkCell(row)).toBe('c-1')
    expect(totalCell(row)).toBe('42')
  })

  test('missing attribute in row renders em-dash', () => {
    const cols = buildItemColumns(
      [{ AttributeName: 'pk', KeyType: 'HASH' }],
      ['pk', 'extra'],
    )
    const row: DdbItem = { pk: { S: 'c-1' } }
    const extraCell = cols[1].cell as (r: DdbItem) => string
    expect(extraCell(row)).toBe('—')
  })
})

describe('TABLE_COLUMNS / TABLE_VISIBLE_CONTENT [DDB-01]', () => {
  test('exports 5 columns in expected order', () => {
    expect(TABLE_COLUMNS.map((c) => c.id)).toEqual([
      'name',
      'status',
      'items',
      'size',
      'created',
    ])
  })

  test('TABLE_VISIBLE_CONTENT mirrors column ids', () => {
    expect(TABLE_VISIBLE_CONTENT).toEqual([
      'name',
      'status',
      'items',
      'size',
      'created',
    ])
  })
})
