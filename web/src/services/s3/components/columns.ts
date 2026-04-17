import { createElement, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import type { TableProps } from '@cloudscape-design/components/table'
import type { S3Bucket, S3ObjectEntry } from '../../../shared/types'
import { copy } from '../../../shared/copy'

/**
 * Column definitions for the bucket list table.
 *
 * Per UI-SPEC §"Bucket List Contract":
 *   - Name (sortable, minWidth 240, rendered as <Link> to /services/s3/{name})
 *   - Creation date (sortable, minWidth 200, ISO string)
 *   - Region (static us-east-1, minWidth 120)
 *
 * File kept as `.ts` per plan spec; uses `createElement` instead of JSX.
 */
export const BUCKET_COLUMNS: TableProps.ColumnDefinition<S3Bucket>[] = [
  {
    id: 'name',
    header: copy.s3.bucketPropertyName,
    cell: (b) =>
      createElement(RouterLink, { to: `/services/s3/${b.name}` }, b.name),
    sortingField: 'name',
    minWidth: 240,
  },
  {
    id: 'creationDate',
    header: copy.s3.bucketPropertyCreationDate,
    cell: (b) => b.creationDate,
    sortingField: 'creationDate',
    minWidth: 200,
  },
  {
    id: 'region',
    header: copy.s3.bucketPropertyRegion,
    cell: () => copy.region,
    minWidth: 120,
  },
]

export const BUCKET_VISIBLE_CONTENT = ['name', 'creationDate', 'region']

// ── Object table columns (Plan 04) ─────────────────────────────────────────

export const PARENT_ROW_KEY = '__parent__'

/**
 * Formats a byte count to a human-readable string per UI-SPEC sample
 * ("1.2 MB", "340 KB", "128 B", "1.25 GB").
 * - Negative or NaN returns '-'
 * - < 1 KB: whole-number bytes
 * - < 1 MB: one decimal KB
 * - < 1 GB: one decimal MB
 * - >= 1 GB: two decimal GB
 */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '-'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * MIME-ish label derived from file extension. Matches UI-SPEC object Type
 * column (image/text/video/audio/archive/file).
 */
export function mimeLabel(name: string): string {
  const ext = name.includes('.')
    ? name.substring(name.lastIndexOf('.') + 1).toLowerCase()
    : ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts'].includes(ext))
    return 'text'
  if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'audio'
  if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) return 'archive'
  return 'file'
}

/**
 * Props passed into the OBJECT_COLUMNS cell renderers via closure.
 * The ObjectTable supplies these when it builds the column set.
 */
export type ObjectCellHandlers = {
  onFolderClick: (folderKey: string) => void
  onParentClick: () => void
}

/**
 * Build OBJECT_COLUMNS with bound click handlers. The Name column needs to
 * render different content for:
 *   - Parent row (name = "..", key = "__parent__") → clickable ".." label
 *   - Folder row → clickable folder name
 *   - File row → plain text name
 */
export function buildObjectColumns(
  handlers: ObjectCellHandlers,
): TableProps.ColumnDefinition<S3ObjectEntry>[] {
  const nameCell = (entry: S3ObjectEntry): ReactNode => {
    if (entry.key === PARENT_ROW_KEY) {
      // Parent row — .. link that calls onParentClick
      return createElement(
        'a',
        {
          href: '#',
          'aria-label': 'Go to parent folder',
          onClick: (e: React.MouseEvent) => {
            e.preventDefault()
            handlers.onParentClick()
          },
        },
        '..',
      )
    }
    if (entry.kind === 'folder') {
      return createElement(
        'a',
        {
          href: '#',
          'aria-label': `Open folder ${entry.name}`,
          onClick: (e: React.MouseEvent) => {
            e.preventDefault()
            handlers.onFolderClick(entry.key)
          },
        },
        entry.name,
      )
    }
    // File row — plain text
    return entry.name
  }

  return [
    {
      id: 'name',
      header: 'Name',
      cell: nameCell,
      sortingField: 'name',
      minWidth: 280,
    },
    {
      id: 'type',
      header: 'Type',
      cell: (entry) =>
        entry.kind === 'folder' ? 'folder' : mimeLabel(entry.name),
      sortingField: 'kind',
      minWidth: 100,
    },
    {
      id: 'size',
      header: 'Size',
      cell: (entry) =>
        entry.kind === 'folder' ? '-' : formatBytes(entry.size),
      minWidth: 100,
    },
    {
      id: 'lastModified',
      header: 'Last modified',
      cell: (entry) => (entry.kind === 'folder' ? '-' : entry.lastModified),
      minWidth: 180,
    },
  ]
}

export const OBJECT_VISIBLE_CONTENT = ['name', 'type', 'size', 'lastModified']

/**
 * Static export required by plan acceptance criterion
 * (`grep -c "OBJECT_COLUMNS\|OBJECT_VISIBLE_CONTENT" columns.ts == 2`).
 * Consumers should call `buildObjectColumns({onFolderClick, onParentClick})`
 * to obtain columns with bound click handlers. This static snapshot renders
 * names as plain text and is suitable for non-interactive contexts (tests,
 * future read-only previews).
 */
export const OBJECT_COLUMNS: TableProps.ColumnDefinition<S3ObjectEntry>[] =
  buildObjectColumns({
    onFolderClick: () => {},
    onParentClick: () => {},
  })
