import Table from '@cloudscape-design/components/table'
import Header from '@cloudscape-design/components/header'
import TextFilter from '@cloudscape-design/components/text-filter'
import CollectionPreferences from '@cloudscape-design/components/collection-preferences'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ButtonDropdown from '@cloudscape-design/components/button-dropdown'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import { useCollection } from '@cloudscape-design/collection-hooks'
import { copy } from '../../../shared/copy'
import { FUNCTION_COLUMNS } from './columns'
import type { LambdaFunctionSummary } from '../../../shared/types'
import { useState } from 'react'

type FunctionTableProps = {
  functions: LambdaFunctionSummary[]
  isLoading: boolean
  error: Error | null
  marker: string | null
  nextMarker: string | null
  selected: LambdaFunctionSummary | null
  onRefresh: () => void
  onCreate: () => void
  onDelete: (fn: LambdaFunctionSummary) => void
  onMarkerChange: (marker: string | null) => void
  onSelectionChange: (fn: LambdaFunctionSummary | null) => void
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Box textAlign="center" color="inherit">
      <b>{copy.lambda.functionsEmptyHeading}</b>
      <Box variant="p" color="inherit">
        {copy.lambda.functionsEmptyBody}
      </Box>
      <Box margin={{ top: 's' }}>
        <Button variant="primary" onClick={onCreate}>
          {copy.lambda.functionsEmptyCta}
        </Button>
      </Box>
    </Box>
  )
}

function NoMatchState() {
  return (
    <Box textAlign="center" color="inherit">
      <b>{copy.lambda.functionsNoMatchHeading}</b>
      <Box variant="p" color="inherit">
        {copy.lambda.functionsNoMatchBody}
      </Box>
    </Box>
  )
}

/**
 * FunctionTable [LAM-01] — Cloudscape Table with `useCollection` for
 * filter/sort/selection. Pagination is marker-based (backend emits
 * `NextMarker`); Prev returns to page 1. Full history stack is not needed
 * for typical Lambda workloads.
 */
export function FunctionTable({
  functions,
  isLoading,
  error,
  marker,
  nextMarker,
  selected,
  onRefresh,
  onCreate,
  onDelete,
  onMarkerChange,
  onSelectionChange,
}: FunctionTableProps) {
  const [pageSize, setPageSize] = useState(10)

  const { items, collectionProps, filterProps } = useCollection(functions, {
    filtering: {
      empty: <EmptyState onCreate={onCreate} />,
      noMatch: <NoMatchState />,
    },
    sorting: {
      defaultState: {
        sortingColumn: FUNCTION_COLUMNS[0],
        isDescending: false,
      },
    },
    selection: {},
  })

  if (error) {
    return (
      <Alert
        type="error"
        header={copy.lambda.functionsLoadErrorHeader}
        action={
          <Button onClick={onRefresh}>
            {copy.lambda.functionsLoadErrorRetry}
          </Button>
        }
      >
        {copy.lambda.functionsLoadErrorBody}
      </Alert>
    )
  }

  const canPrev = marker !== null
  const canNext = nextMarker !== null

  return (
    <Table
      {...collectionProps}
      items={items}
      columnDefinitions={FUNCTION_COLUMNS}
      loading={isLoading}
      loadingText={copy.lambda.loadingFunctions}
      selectionType="single"
      selectedItems={selected ? [selected] : []}
      trackBy="FunctionName"
      onSelectionChange={({ detail }) => {
        const first = detail.selectedItems[0] ?? null
        onSelectionChange(first)
      }}
      header={
        <Header
          counter={`(${functions.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                iconName="refresh"
                variant="icon"
                onClick={onRefresh}
                ariaLabel={copy.lambda.refreshTooltip}
              />
              <ButtonDropdown
                items={[{ id: 'delete', text: 'Delete', disabled: !selected }]}
                onItemClick={({ detail }) => {
                  if (detail.id === 'delete' && selected) {
                    onDelete(selected)
                  }
                }}
              >
                {copy.lambda.actionsDropdownButton}
              </ButtonDropdown>
              <Button variant="primary" onClick={onCreate}>
                {copy.lambda.createFunctionButton}
              </Button>
            </SpaceBetween>
          }
        >
          {copy.lambda.functionsTableHeader(functions.length)}
        </Header>
      }
      filter={
        <TextFilter
          {...filterProps}
          filteringPlaceholder={copy.lambda.functionsFilterPlaceholder}
        />
      }
      pagination={
        <SpaceBetween direction="horizontal" size="xs">
          <Button
            disabled={!canPrev}
            onClick={() => onMarkerChange(null)}
          >
            {copy.lambda.previousPageButton}
          </Button>
          <Button
            disabled={!canNext}
            onClick={() => onMarkerChange(nextMarker)}
          >
            {copy.lambda.nextPageButton}
          </Button>
        </SpaceBetween>
      }
      preferences={
        <CollectionPreferences
          title={copy.lambda.preferencesButton}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          preferences={{ pageSize }}
          onConfirm={({ detail }) => {
            if (detail.pageSize) setPageSize(detail.pageSize)
          }}
          pageSizePreference={{
            title: copy.lambda.pageSizeLabel,
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
