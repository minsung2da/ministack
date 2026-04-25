import type { TableProps } from '@cloudscape-design/components/table'
import { Link } from 'react-router-dom'
import { createElement } from 'react'
import { RelativeTime } from './RelativeTime'
import type { LambdaFunctionSummary } from '../../../shared/types'

function formatBytes(n: number): string {
  if (!n && n !== 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export const FUNCTION_COLUMNS: TableProps.ColumnDefinition<LambdaFunctionSummary>[] =
  [
    {
      id: 'name',
      header: 'Function name',
      sortingField: 'FunctionName',
      minWidth: 240,
      cell: (f) =>
        createElement(
          Link,
          { to: `/services/lambda/${encodeURIComponent(f.FunctionName)}` },
          f.FunctionName,
        ),
    },
    {
      id: 'runtime',
      header: 'Runtime',
      sortingField: 'Runtime',
      minWidth: 140,
      cell: (f) => (f.PackageType === 'Image' ? 'Image' : f.Runtime || '—'),
    },
    {
      id: 'handler',
      header: 'Handler',
      sortingField: 'Handler',
      minWidth: 180,
      cell: (f) => f.Handler || '—',
    },
    {
      id: 'codeSize',
      header: 'Code size',
      sortingField: 'CodeSize',
      minWidth: 120,
      cell: (f) => formatBytes(f.CodeSize),
    },
    {
      id: 'lastModified',
      header: 'Last modified',
      sortingField: 'LastModified',
      minWidth: 180,
      cell: (f) => createElement(RelativeTime, { iso: f.LastModified }),
    },
  ]

export const FUNCTION_VISIBLE_CONTENT = [
  'name',
  'runtime',
  'handler',
  'codeSize',
  'lastModified',
]
