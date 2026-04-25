import { useMemo, useState } from 'react'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ButtonDropdown from '@cloudscape-design/components/button-dropdown'
import CollectionPreferences from '@cloudscape-design/components/collection-preferences'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Table from '@cloudscape-design/components/table'
import TextFilter from '@cloudscape-design/components/text-filter'
import Alert from '@cloudscape-design/components/alert'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import { useCollection } from '@cloudscape-design/collection-hooks'
import { useQueries } from '@tanstack/react-query'
import { useTables } from './api/useTables'
import { ddbJsonCall } from './api/ddbClient'
import { ddbKeys } from './api/ddbKeys'
import type { DdbTableDescription } from '../../shared/types/ddb'
import {
  TABLE_COLUMNS,
  TABLE_VISIBLE_CONTENT,
  type TableRow,
} from './components/columns'
import { CreateTableModal } from './components/CreateTableModal'
import { DeleteTableModal } from './components/DeleteTableModal'
import {
  useFlashNotifications,
  FlashNotifications,
} from '../ec2/components/FlashNotifications'
import { copy } from '../../shared/copy'

/**
 * TableListPage [DDB-01] — DDB table list with useCollection + DescribeTable
 * fan-out for per-row columns (status / items / size / created).
 */
export default function TableListPage() {
  const tablesQ = useTables()
  const names = tablesQ.data?.TableNames ?? []

  // Fan-out DescribeTable so the list has per-row status / items / size / created.
  const descs = useQueries({
    queries: names.map((n) => ({
      queryKey: ddbKeys.table(n),
      queryFn: async () => {
        const res = await ddbJsonCall<{ Table: DdbTableDescription }>(
          'DescribeTable',
          { TableName: n },
        )
        return res.Table
      },
      staleTime: 10_000,
    })),
  })

  const rows: TableRow[] = useMemo(
    () =>
      names.map((n, i) => {
        const t = descs[i]?.data
        return {
          TableName: n,
          TableStatus: t?.TableStatus,
          ItemCount: t?.ItemCount,
          TableSizeBytes: t?.TableSizeBytes,
          CreationDateTime: t?.CreationDateTime,
        }
      }),
    [names, descs],
  )

  const [selected, setSelected] = useState<TableRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TableRow | null>(null)
  const [pageSize, setPageSize] = useState(25)
  const {
    items: flashItems,
    addSuccess,
    addError,
  } = useFlashNotifications()

  const { items, collectionProps, filterProps } = useCollection(rows, {
    filtering: {
      empty: (
        <Box padding="m" textAlign="center">
          <b>{copy.ddb.tablesEmptyHeading}</b>
          <Box variant="p">{copy.ddb.tablesEmptyBody}</Box>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            {copy.ddb.tablesEmptyCta}
          </Button>
        </Box>
      ),
      noMatch: (
        <Box padding="m" textAlign="center">
          <b>{copy.ddb.tablesNoMatchHeading}</b>
          <Box variant="p">{copy.ddb.tablesNoMatchBody}</Box>
        </Box>
      ),
    },
    sorting: {
      defaultState: { sortingColumn: TABLE_COLUMNS[0], isDescending: false },
    },
    selection: {},
  })

  const error = tablesQ.error as Error | null

  return (
    <SpaceBetween size="l">
      <FlashNotifications items={flashItems} />
      <BreadcrumbGroup
        items={[
          { text: copy.breadcrumbRoot, href: '/_console' },
          { text: copy.ddb.serviceHeading, href: '' },
        ]}
      />
      <Header variant="h1" description={copy.ddb.serviceDescription}>
        {copy.ddb.serviceHeading}
      </Header>

      {error && (
        <Alert
          type="error"
          header={copy.ddb.tablesLoadErrorHeader}
          action={
            <Button onClick={() => void tablesQ.refetch()}>
              {copy.ddb.tablesLoadErrorRetry}
            </Button>
          }
        >
          {error.message}
        </Alert>
      )}

      <Table
        {...collectionProps}
        items={items}
        columnDefinitions={TABLE_COLUMNS}
        visibleColumns={TABLE_VISIBLE_CONTENT}
        loading={tablesQ.isLoading}
        loadingText={copy.ddb.loadingTables}
        selectionType="single"
        selectedItems={selected ? [selected] : []}
        trackBy="TableName"
        onSelectionChange={({ detail }) => {
          setSelected(detail.selectedItems[0] ?? null)
        }}
        header={
          <Header
            counter={`(${rows.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  iconName="refresh"
                  variant="icon"
                  onClick={() => void tablesQ.refetch()}
                  ariaLabel={copy.ddb.refreshTooltip}
                />
                <ButtonDropdown
                  items={[
                    {
                      id: 'delete',
                      text: 'Delete',
                      disabled: !selected,
                    },
                  ]}
                  onItemClick={({ detail }) => {
                    if (detail.id === 'delete' && selected) {
                      setDeleteTarget(selected)
                    }
                  }}
                >
                  {copy.ddb.actionsDropdownButton}
                </ButtonDropdown>
                <Button
                  variant="primary"
                  onClick={() => setCreateOpen(true)}
                >
                  {copy.ddb.createTableButton}
                </Button>
              </SpaceBetween>
            }
          >
            {copy.ddb.tablesTableHeader(rows.length)}
          </Header>
        }
        filter={
          <TextFilter
            {...filterProps}
            filteringPlaceholder={copy.ddb.tablesFilterPlaceholder}
          />
        }
        preferences={
          <CollectionPreferences
            title={copy.ddb.preferencesButton}
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={{ pageSize }}
            onConfirm={({ detail }) => {
              if (detail.pageSize) setPageSize(detail.pageSize)
            }}
            pageSizePreference={{
              title: copy.ddb.pageSizeLabel,
              options: [
                { value: 10, label: '10' },
                { value: 25, label: '25' },
                { value: 50, label: '50' },
              ],
            }}
          />
        }
      />

      <CreateTableModal
        visible={createOpen}
        onDismiss={() => setCreateOpen(false)}
        onCreated={(n) => {
          addSuccess(copy.ddb.createTableSuccess(n))
          setCreateOpen(false)
        }}
        onFailed={(msg) => addError(copy.ddb.createTableFailure(msg))}
      />

      <DeleteTableModal
        visible={deleteTarget !== null}
        tableName={deleteTarget?.TableName ?? ''}
        onDismiss={() => setDeleteTarget(null)}
        onDeleted={(n) => {
          addSuccess(copy.ddb.deleteTableSuccess(n))
          setDeleteTarget(null)
          setSelected(null)
        }}
        onFailed={(n, e) => {
          addError(copy.ddb.deleteTableFailure(n, e.message))
          setDeleteTarget(null)
        }}
      />
    </SpaceBetween>
  )
}
