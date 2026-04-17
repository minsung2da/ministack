import Table from '@cloudscape-design/components/table'
import Header from '@cloudscape-design/components/header'
import Pagination from '@cloudscape-design/components/pagination'
import TextFilter from '@cloudscape-design/components/text-filter'
import CollectionPreferences from '@cloudscape-design/components/collection-preferences'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ButtonDropdown from '@cloudscape-design/components/button-dropdown'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import { useCollection } from '@cloudscape-design/collection-hooks'
import { useUiStore } from '../../../stores/uiStore'
import { copy } from '../../../shared/copy'
import { BUCKET_COLUMNS } from './columns'
import type { S3Bucket } from '../../../shared/types'

type BucketTableProps = {
  buckets: S3Bucket[]
  loading: boolean
  error: Error | null
  selectedItems: S3Bucket[]
  onRefresh: () => void
  onCreate: () => void
  onDeleteSelected: (buckets: S3Bucket[]) => void
  onSelectionChange: (selectedBucket: S3Bucket | null) => void
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Box textAlign="center" color="inherit">
      <b>{copy.s3.bucketsEmptyHeading}</b>
      <Box variant="p" color="inherit">
        {copy.s3.bucketsEmptyBody}
      </Box>
      <Box margin={{ top: 's' }}>
        <Button variant="primary" onClick={onCreate}>
          {copy.s3.bucketsEmptyCta}
        </Button>
      </Box>
    </Box>
  )
}

function NoMatchState() {
  return (
    <Box textAlign="center" color="inherit">
      <b>{copy.s3.bucketsNoMatchHeading}</b>
      <Box variant="p" color="inherit">
        {copy.s3.bucketsNoMatchBody}
      </Box>
    </Box>
  )
}

export function BucketTable({
  buckets,
  loading,
  error,
  selectedItems,
  onRefresh,
  onCreate,
  onDeleteSelected,
  onSelectionChange,
}: BucketTableProps) {
  const pageSize = useUiStore((s) => s.s3BucketPageSize)
  const setPageSize = useUiStore((s) => s.setS3BucketPageSize)

  const { items, collectionProps, filterProps, paginationProps } = useCollection(
    buckets,
    {
      filtering: {
        empty: <EmptyState onCreate={onCreate} />,
        noMatch: <NoMatchState />,
      },
      pagination: { pageSize },
      sorting: { defaultState: { sortingColumn: BUCKET_COLUMNS[0] } },
      selection: {},
    },
  )

  if (error) {
    return (
      <Alert
        type="error"
        header={copy.s3.bucketsLoadErrorHeading}
        action={
          <Button onClick={onRefresh}>{copy.s3.bucketsLoadErrorRetry}</Button>
        }
      >
        {copy.s3.bucketsLoadErrorBody}
      </Alert>
    )
  }

  return (
    <Table
      {...collectionProps}
      items={items}
      columnDefinitions={BUCKET_COLUMNS}
      loading={loading}
      loadingText={copy.s3.loadingBuckets}
      selectionType="multi"
      selectedItems={selectedItems}
      trackBy="name"
      onSelectionChange={({ detail }) => {
        // Detail panel shows the first selected bucket (if any); bulk-delete
        // still reads `selectedItems` directly via the parent's state.
        const first = detail.selectedItems[0] ?? null
        onSelectionChange(first)
      }}
      header={
        <Header
          counter={`(${buckets.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                iconName="refresh"
                variant="icon"
                onClick={onRefresh}
                ariaLabel={copy.s3.refreshTooltip}
              />
              <ButtonDropdown
                items={[{ id: 'delete', text: 'Delete' }]}
                disabled={selectedItems.length === 0}
                onItemClick={({ detail }) => {
                  if (detail.id === 'delete') {
                    onDeleteSelected(selectedItems)
                  }
                }}
              >
                {copy.s3.actionsDropdownButton}
              </ButtonDropdown>
              <Button variant="primary" onClick={onCreate}>
                {copy.s3.createBucketHeader}
              </Button>
            </SpaceBetween>
          }
        >
          {copy.s3.bucketsTableHeader(buckets.length)}
        </Header>
      }
      filter={
        <TextFilter
          {...filterProps}
          filteringPlaceholder={copy.s3.bucketsFilterPlaceholder}
        />
      }
      pagination={<Pagination {...paginationProps} />}
      preferences={
        <CollectionPreferences
          title={copy.s3.preferencesButton}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          preferences={{ pageSize }}
          onConfirm={({ detail }) => {
            if (detail.pageSize) setPageSize(detail.pageSize)
          }}
          pageSizePreference={{
            title: copy.s3.pageSizeLabel,
            options: [
              { value: 10, label: '10' },
              { value: 25, label: '25' },
              { value: 50, label: '50' },
            ],
          }}
        />
      }
      empty={<EmptyState onCreate={onCreate} />}
    />
  )
}
