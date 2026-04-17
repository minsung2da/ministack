import { useMemo, useState } from 'react'
import Table from '@cloudscape-design/components/table'
import Header from '@cloudscape-design/components/header'
import TextFilter from '@cloudscape-design/components/text-filter'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ButtonDropdown from '@cloudscape-design/components/button-dropdown'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import { copy } from '../../../shared/copy'
import type { ListObjectsResult, S3ObjectEntry } from '../../../shared/types'
import { buildObjectColumns, PARENT_ROW_KEY } from './columns'

type Pagination = {
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  pageLabel: string
}

type ObjectTableProps = {
  bucket: string
  prefix: string
  data: ListObjectsResult | undefined
  isLoading: boolean
  error: Error | null
  selected: S3ObjectEntry[]
  onSelectionChange: (sel: S3ObjectEntry[]) => void
  onFileClick: (entry: Extract<S3ObjectEntry, { kind: 'file' }>) => void
  onFolderClick: (folderKey: string) => void
  onParentClick: () => void
  onRefresh: () => void
  onUploadClick: () => void
  onDeleteSelected: () => void
  onDownloadSelected?: () => void
  pagination: Pagination
}

const PARENT_ROW: S3ObjectEntry = {
  kind: 'folder',
  key: PARENT_ROW_KEY,
  name: '..',
}

function EmptyState({
  prefix,
  onUpload,
}: {
  prefix: string
  onUpload: () => void
}) {
  const heading = prefix ? copy.s3.emptyPrefixHeading : copy.s3.emptyBucketHeading
  const body = prefix ? copy.s3.emptyPrefixBody : copy.s3.emptyBucketBody
  return (
    <Box textAlign="center" color="inherit">
      <b>{heading}</b>
      <Box variant="p" color="inherit">
        {body}
      </Box>
      <Box margin={{ top: 's' }}>
        <Button variant="primary" onClick={onUpload}>
          {copy.s3.emptyBucketCta}
        </Button>
      </Box>
    </Box>
  )
}

function NoMatchState({ onClear }: { onClear: () => void }) {
  return (
    <Box textAlign="center" color="inherit">
      <b>{copy.s3.objectsNoMatchHeading}</b>
      <Box variant="p" color="inherit">
        {copy.s3.objectsNoMatchBody}
      </Box>
      <Box margin={{ top: 's' }}>
        <Button onClick={onClear}>{copy.s3.objectsNoMatchCta}</Button>
      </Box>
    </Box>
  )
}

export function ObjectTable({
  bucket: _bucket,
  prefix,
  data,
  isLoading,
  error,
  selected,
  onSelectionChange,
  onFileClick,
  onFolderClick,
  onParentClick,
  onRefresh,
  onUploadClick,
  onDeleteSelected,
  onDownloadSelected,
  pagination,
}: ObjectTableProps) {
  const [filterText, setFilterText] = useState('')

  // Build columns with click handlers bound.
  const columnDefinitions = useMemo(
    () => buildObjectColumns({ onFolderClick, onParentClick }),
    [onFolderClick, onParentClick],
  )

  // Error state: inline Alert with Retry (parallel to BucketTable pattern).
  if (error) {
    return (
      <Alert
        type="error"
        header={copy.s3.objectsLoadErrorHeading}
        action={
          <Button onClick={onRefresh}>{copy.s3.objectsLoadErrorRetry}</Button>
        }
      >
        {copy.s3.objectsLoadErrorBody(_bucket)}
      </Alert>
    )
  }

  const rawEntries = data?.entries ?? []

  // Synthetic parent row — only when inside a non-root prefix.
  const withParent: S3ObjectEntry[] =
    prefix !== '' ? [PARENT_ROW, ...rawEntries] : rawEntries

  // TextFilter: filter by basename. Parent row is always shown (bypasses filter).
  const needle = filterText.trim().toLowerCase()
  const items = needle
    ? withParent.filter(
        (e) => e.key === PARENT_ROW_KEY || e.name.toLowerCase().includes(needle),
      )
    : withParent

  const keyCount = data?.keyCount ?? 0
  const hasSelection = selected.length > 0

  return (
    <Table
      items={items}
      columnDefinitions={columnDefinitions}
      loading={isLoading}
      loadingText={copy.s3.loadingObjects}
      selectionType="multi"
      selectedItems={selected}
      trackBy="key"
      isItemDisabled={(entry) =>
        entry.key === PARENT_ROW_KEY || entry.kind === 'folder'
      }
      onSelectionChange={({ detail }) => {
        // Filter folders and parent row from the selection (defensive;
        // isItemDisabled should prevent them from entering selection).
        const filesOnly = detail.selectedItems.filter(
          (e) => e.kind === 'file' && e.key !== PARENT_ROW_KEY,
        )
        onSelectionChange(filesOnly)
      }}
      onRowClick={({ detail }) => {
        const entry = detail.item
        if (entry.key === PARENT_ROW_KEY) {
          onParentClick()
        } else if (entry.kind === 'folder') {
          onFolderClick(entry.key)
        } else {
          onFileClick(entry)
        }
      }}
      header={
        <Header
          counter={`(${keyCount})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                iconName="refresh"
                variant="icon"
                onClick={onRefresh}
                ariaLabel={copy.s3.refreshTooltip}
              />
              <ButtonDropdown
                items={[
                  {
                    id: 'download',
                    text: copy.s3.downloadButton,
                    disabled: !hasSelection,
                  },
                  {
                    id: 'delete',
                    text: copy.s3.deleteBucketCta,
                    disabled: !hasSelection,
                  },
                ]}
                onItemClick={({ detail }) => {
                  if (detail.id === 'delete') onDeleteSelected()
                  else if (detail.id === 'download') onDownloadSelected?.()
                }}
              >
                {copy.s3.actionsDropdownButton}
              </ButtonDropdown>
              <Button variant="primary" onClick={onUploadClick}>
                {copy.s3.uploadButton}
              </Button>
            </SpaceBetween>
          }
        >
          {copy.s3.objectsTableHeader(keyCount)}
        </Header>
      }
      filter={
        <TextFilter
          filteringText={filterText}
          filteringPlaceholder={copy.s3.objectsFilterPlaceholder}
          onChange={({ detail }) => setFilterText(detail.filteringText)}
        />
      }
      pagination={
        <SpaceBetween direction="horizontal" size="xs">
          <Button
            disabled={!pagination.canPrev}
            onClick={pagination.onPrev}
          >
            {copy.s3.previousPageButton}
          </Button>
          <Box variant="span" padding={{ horizontal: 's' }}>
            {pagination.pageLabel}
          </Box>
          <Button
            disabled={!pagination.canNext}
            onClick={pagination.onNext}
          >
            {copy.s3.nextPageButton}
          </Button>
        </SpaceBetween>
      }
      empty={
        needle ? (
          <NoMatchState onClear={() => setFilterText('')} />
        ) : (
          <EmptyState prefix={prefix} onUpload={onUploadClick} />
        )
      }
    />
  )
}
