import type { TableProps } from '@cloudscape-design/components/table'
import type { ColumnDefinition } from '../types'

/**
 * Thin mapper from descriptor `ColumnDefinition[]` to Cloudscape's
 * `TableProps.ColumnDefinition[]`. Centralized so future enrichment
 * (sticky columns, width overrides) has exactly one touch point.
 */
export function buildColumns<Row>(
  defs: ColumnDefinition<Row>[],
): TableProps.ColumnDefinition<Row>[] {
  return defs.map((d) => ({
    id: d.id,
    header: d.header,
    sortingField: d.sortingField,
    cell: d.cell,
    minWidth: d.width,
  }))
}
