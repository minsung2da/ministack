import type { ReactNode } from 'react'
import Table from '@cloudscape-design/components/table'
import type { TableProps } from '@cloudscape-design/components/table'
import Header from '@cloudscape-design/components/header'
import Pagination from '@cloudscape-design/components/pagination'
import PropertyFilter from '@cloudscape-design/components/property-filter'
import type { PropertyFilterProps } from '@cloudscape-design/components/property-filter'
import TextFilter from '@cloudscape-design/components/text-filter'
import CollectionPreferences from '@cloudscape-design/components/collection-preferences'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Button from '@cloudscape-design/components/button'
import { useCollection } from '@cloudscape-design/collection-hooks'
import { useUiStore } from '../../../stores/uiStore'
import { copy } from '../../../shared/copy'

type ResourceTableProps<T> = {
  items: T[]
  loading: boolean
  columnDefinitions: TableProps.ColumnDefinition<T>[]
  resourceType: string
  filteringProperties: PropertyFilterProps.FilteringProperty[]
  selectedItems: T[]
  onSelectionChange: (items: T[]) => void
  onRowClick?: (item: T) => void
  headerActions?: ReactNode
  selectionType?: 'multi' | 'single' | 'none'
  useTextFilter?: boolean
  trackBy?: string | ((item: T) => string)
}

const PROPERTY_FILTER_I18N: PropertyFilterProps.I18nStrings = {
  filteringAriaLabel: copy.ec2FilterPlaceholder,
  filteringPlaceholder: copy.ec2FilterPlaceholder,
  enteredTextLabel: (text) => `Use: "${text}"`,
  allPropertiesLabel: 'All properties',
  operationAndText: 'and',
  operationOrText: 'or',
  operatorLessText: 'Less than',
  operatorLessOrEqualText: 'Less than or equal to',
  operatorGreaterText: 'Greater than',
  operatorGreaterOrEqualText: 'Greater than or equal to',
  operatorContainsText: 'Contains',
  operatorDoesNotContainText: 'Does not contain',
  operatorEqualsText: 'Equals',
  operatorDoesNotEqualText: 'Does not equal',
  editTokenHeader: 'Edit filter',
  groupValuesText: 'Values',
  groupPropertiesText: 'Properties',
  tokenLimitShowMore: 'Show more',
  tokenLimitShowFewer: 'Show fewer',
  clearFiltersText: copy.ec2NoMatchCta,
  removeTokenButtonAriaLabel: () => 'Remove filter',
  cancelActionText: 'Cancel',
  applyActionText: 'Apply',
}

function EmptyState({ resourceType }: { resourceType: string }) {
  return (
    <Box textAlign="center" color="inherit">
      <b>{copy.ec2EmptyHeading(resourceType)}</b>
      <Box variant="p" color="inherit">
        {copy.ec2EmptyBody[resourceType] ?? ''}
      </Box>
      {copy.ec2EmptyCta[resourceType] && (
        <Box margin={{ top: 's' }}>
          <Button>{copy.ec2EmptyCta[resourceType]}</Button>
        </Box>
      )}
    </Box>
  )
}

function NoMatchState({ resourceType }: { resourceType: string }) {
  return (
    <Box textAlign="center" color="inherit">
      <b>{copy.ec2NoMatchHeading}</b>
      <Box variant="p" color="inherit">
        {copy.ec2NoMatchBody(resourceType)}
      </Box>
    </Box>
  )
}

// Variant: text filter (no propertyFiltering)
function ResourceTableText<T extends object>({
  items,
  loading,
  columnDefinitions,
  resourceType,
  selectedItems,
  onSelectionChange,
  onRowClick,
  headerActions,
  selectionType = 'multi',
  trackBy,
  ec2PageSize,
  setEc2PageSize,
}: Omit<ResourceTableProps<T>, 'filteringProperties' | 'useTextFilter'> & {
  ec2PageSize: number
  setEc2PageSize: (n: number) => void
}) {
  const { items: collectionItems, collectionProps, filterProps, paginationProps } =
    useCollection(items, {
      filtering: {
        empty: <EmptyState resourceType={resourceType} />,
        noMatch: <NoMatchState resourceType={resourceType} />,
      },
      pagination: { pageSize: ec2PageSize },
      sorting: {},
      selection: {},
    })

  return (
    <Table
      {...collectionProps}
      items={collectionItems}
      columnDefinitions={columnDefinitions}
      loading={loading}
      loadingText={`Loading ${resourceType}`}
      selectionType={selectionType === 'none' ? undefined : selectionType}
      selectedItems={selectedItems}
      onSelectionChange={({ detail }) => onSelectionChange(detail.selectedItems)}
      onRowClick={onRowClick ? ({ detail }) => onRowClick(detail.item) : undefined}
      trackBy={trackBy}
      header={
        <Header
          counter={`(${items.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              {headerActions}
            </SpaceBetween>
          }
        >
          {copy.ec2TableHeader(resourceType, items.length)}
        </Header>
      }
      filter={
        <TextFilter
          {...filterProps}
          filteringPlaceholder={copy.ec2FilterPlaceholder}
        />
      }
      pagination={<Pagination {...paginationProps} />}
      preferences={
        <CollectionPreferences
          title={copy.ec2PreferencesButton}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          preferences={{ pageSize: ec2PageSize }}
          onConfirm={({ detail }) => {
            if (detail.pageSize) setEc2PageSize(detail.pageSize)
          }}
          pageSizePreference={{
            title: copy.ec2PageSizeLabel,
            options: [
              { value: 10, label: '10' },
              { value: 25, label: '25' },
              { value: 50, label: '50' },
            ],
          }}
        />
      }
      empty={<EmptyState resourceType={resourceType} />}
    />
  )
}

// Variant: property filter
function ResourceTableProperty<T extends object>({
  items,
  loading,
  columnDefinitions,
  resourceType,
  filteringProperties,
  selectedItems,
  onSelectionChange,
  onRowClick,
  headerActions,
  selectionType = 'multi',
  trackBy,
  ec2PageSize,
  setEc2PageSize,
}: Omit<ResourceTableProps<T>, 'useTextFilter'> & {
  ec2PageSize: number
  setEc2PageSize: (n: number) => void
}) {
  const { items: collectionItems, collectionProps, propertyFilterProps, paginationProps } =
    useCollection(items, {
      propertyFiltering: {
        filteringProperties,
        empty: <EmptyState resourceType={resourceType} />,
        noMatch: <NoMatchState resourceType={resourceType} />,
      },
      pagination: { pageSize: ec2PageSize },
      sorting: {},
      selection: {},
    })

  return (
    <Table
      {...collectionProps}
      items={collectionItems}
      columnDefinitions={columnDefinitions}
      loading={loading}
      loadingText={`Loading ${resourceType}`}
      selectionType={selectionType === 'none' ? undefined : selectionType}
      selectedItems={selectedItems}
      onSelectionChange={({ detail }) => onSelectionChange(detail.selectedItems)}
      onRowClick={onRowClick ? ({ detail }) => onRowClick(detail.item) : undefined}
      trackBy={trackBy}
      header={
        <Header
          counter={`(${items.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              {headerActions}
            </SpaceBetween>
          }
        >
          {copy.ec2TableHeader(resourceType, items.length)}
        </Header>
      }
      filter={
        <PropertyFilter
          {...propertyFilterProps}
          filteringProperties={filteringProperties}
          i18nStrings={PROPERTY_FILTER_I18N}
        />
      }
      pagination={<Pagination {...paginationProps} />}
      preferences={
        <CollectionPreferences
          title={copy.ec2PreferencesButton}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          preferences={{ pageSize: ec2PageSize }}
          onConfirm={({ detail }) => {
            if (detail.pageSize) setEc2PageSize(detail.pageSize)
          }}
          pageSizePreference={{
            title: copy.ec2PageSizeLabel,
            options: [
              { value: 10, label: '10' },
              { value: 25, label: '25' },
              { value: 50, label: '50' },
            ],
          }}
        />
      }
      empty={<EmptyState resourceType={resourceType} />}
    />
  )
}

export function ResourceTable<T extends object>(props: ResourceTableProps<T>) {
  const ec2PageSize = useUiStore((s) => s.ec2PageSize)
  const setEc2PageSize = useUiStore((s) => s.setEc2PageSize)

  if (props.useTextFilter) {
    return (
      <ResourceTableText
        {...props}
        ec2PageSize={ec2PageSize}
        setEc2PageSize={setEc2PageSize}
      />
    )
  }

  return (
    <ResourceTableProperty
      {...props}
      ec2PageSize={ec2PageSize}
      setEc2PageSize={setEc2PageSize}
    />
  )
}
