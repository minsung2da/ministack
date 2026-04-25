import type { TableProps } from '@cloudscape-design/components/table'
import { Link } from 'react-router-dom'
import { createElement } from 'react'
import { RelativeTime } from '../../lambda/components/RelativeTime'
import { renderAttributeValue } from '../api/attributeValue'
import type {
  DdbItem,
  DdbKeySchemaEntry,
} from '../../../shared/types/ddb'

export type TableRow = {
  TableName: string
  TableStatus?: string
  ItemCount?: number
  TableSizeBytes?: number
  CreationDateTime?: number
}

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return '—'
  return n.toLocaleString()
}

export const TABLE_COLUMNS: TableProps.ColumnDefinition<TableRow>[] = [
  {
    id: 'name',
    header: 'Name',
    sortingField: 'TableName',
    minWidth: 240,
    cell: (t) =>
      createElement(
        Link,
        { to: `/services/ddb/${encodeURIComponent(t.TableName)}` },
        t.TableName,
      ),
  },
  {
    id: 'status',
    header: 'Status',
    sortingField: 'TableStatus',
    minWidth: 120,
    cell: (t) => t.TableStatus ?? '—',
  },
  {
    id: 'items',
    header: 'Items',
    sortingField: 'ItemCount',
    minWidth: 100,
    cell: (t) => formatNumber(t.ItemCount),
  },
  {
    id: 'size',
    header: 'Size (bytes)',
    sortingField: 'TableSizeBytes',
    minWidth: 140,
    cell: (t) => formatNumber(t.TableSizeBytes),
  },
  {
    id: 'created',
    header: 'Created',
    minWidth: 180,
    cell: (t) =>
      t.CreationDateTime
        ? createElement(RelativeTime, {
            iso: new Date(t.CreationDateTime * 1000).toISOString(),
          })
        : '—',
  },
]

export const TABLE_VISIBLE_CONTENT = ['name', 'status', 'items', 'size', 'created']

/**
 * buildItemColumns — dynamic item-table columns.
 *
 * KeySchema attributes come first (labeled `(key)`), then the union of
 * observed attribute names in stable alpha order. Values are flattened via
 * `renderAttributeValue` so the cell stays scalar text even for complex
 * wire types (read-path only — D-06).
 */
export function buildItemColumns(
  keySchema: DdbKeySchemaEntry[],
  observedAttrs: string[],
): TableProps.ColumnDefinition<DdbItem>[] {
  const keyAttrs = keySchema.map((k) => k.AttributeName)
  const rest = observedAttrs.filter((a) => !keyAttrs.includes(a)).sort()
  const ordered = [...keyAttrs, ...rest]
  return ordered.map((attr) => ({
    id: attr,
    header: keyAttrs.includes(attr) ? `${attr} (key)` : attr,
    minWidth: 140,
    cell: (row: DdbItem) =>
      row[attr] !== undefined ? renderAttributeValue(row[attr]) : '—',
  }))
}
