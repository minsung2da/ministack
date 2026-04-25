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
import { useQueues } from './api/useQueues'
import {
  QUEUE_COLUMNS,
  QUEUE_VISIBLE_CONTENT,
  type QueueRow,
} from './components/columns'
import { CreateQueueModal } from './components/CreateQueueModal'
import { DeleteQueueModal } from './components/DeleteQueueModal'
import {
  useFlashNotifications,
  FlashNotifications,
} from '../ec2/components/FlashNotifications'
import { copy } from '../../shared/copy'

function queueNameFromUrl(url: string): string {
  const parts = url.split('/')
  return parts[parts.length - 1] ?? url
}

/**
 * QueueListPage [SQS-01] — SQS queue list.
 */
export default function QueueListPage() {
  const queuesQ = useQueues()
  const { items: flashItems, addSuccess, addError } = useFlashNotifications()

  const rows: QueueRow[] = useMemo(
    () =>
      queuesQ.data.map((q) => ({
        queueUrl: q.url,
        queueName: queueNameFromUrl(q.url),
        available: q.attributes?.ApproximateNumberOfMessages ?? 0,
        inFlight:
          q.attributes?.ApproximateNumberOfMessagesNotVisible ?? 0,
      })),
    [queuesQ.data],
  )

  const [selected, setSelected] = useState<QueueRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<QueueRow | null>(null)
  const [pageSize, setPageSize] = useState(25)

  const { items, collectionProps, filterProps } = useCollection(rows, {
    filtering: {
      empty: (
        <Box padding="m" textAlign="center">
          <b>{copy.sqs.queuesEmptyHeading}</b>
          <Box variant="p">{copy.sqs.queuesEmpty}</Box>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            {copy.sqs.createButton}
          </Button>
        </Box>
      ),
      noMatch: (
        <Box padding="m" textAlign="center">
          <b>{copy.sqs.queuesNoMatchHeading}</b>
          <Box variant="p">{copy.sqs.queuesNoMatchBody}</Box>
        </Box>
      ),
    },
    sorting: {
      defaultState: { sortingColumn: QUEUE_COLUMNS[0], isDescending: false },
    },
    selection: {},
  })

  const error = queuesQ.error as Error | null

  return (
    <SpaceBetween size="l">
      <FlashNotifications items={flashItems} />
      <BreadcrumbGroup
        items={[
          { text: copy.breadcrumbRoot, href: '/_console' },
          { text: copy.sqs.serviceHeading, href: '' },
        ]}
      />
      <Header variant="h1" description={copy.sqs.serviceDescription}>
        {copy.sqs.serviceHeading}
      </Header>

      {error && (
        <Alert
          type="error"
          header={copy.sqs.queuesLoadErrorHeader}
          action={
            <Button onClick={() => void queuesQ.refetch()}>
              {copy.sqs.loadErrorRetry}
            </Button>
          }
        >
          {error.message}
        </Alert>
      )}

      <Table
        {...collectionProps}
        items={items}
        columnDefinitions={QUEUE_COLUMNS}
        visibleColumns={QUEUE_VISIBLE_CONTENT}
        loading={queuesQ.isLoading}
        loadingText={copy.sqs.loadingQueues}
        selectionType="single"
        selectedItems={selected ? [selected] : []}
        trackBy="queueUrl"
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
                  onClick={() => void queuesQ.refetch()}
                  ariaLabel={copy.sqs.refreshTooltip}
                />
                <ButtonDropdown
                  items={[
                    {
                      id: 'delete',
                      text: copy.sqs.deleteButton,
                      disabled: !selected,
                    },
                  ]}
                  onItemClick={({ detail }) => {
                    if (detail.id === 'delete' && selected) {
                      setDeleteTarget(selected)
                    }
                  }}
                >
                  {copy.sqs.actionsDropdownButton}
                </ButtonDropdown>
                <Button
                  variant="primary"
                  onClick={() => setCreateOpen(true)}
                >
                  {copy.sqs.createButton}
                </Button>
              </SpaceBetween>
            }
          >
            {copy.sqs.queuesTableHeader(rows.length)}
          </Header>
        }
        filter={
          <TextFilter
            {...filterProps}
            filteringPlaceholder={copy.sqs.queuesFilterPlaceholder}
          />
        }
        preferences={
          <CollectionPreferences
            title={copy.sqs.preferencesButton}
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={{ pageSize }}
            onConfirm={({ detail }) => {
              if (detail.pageSize) setPageSize(detail.pageSize)
            }}
            pageSizePreference={{
              title: copy.sqs.pageSizeLabel,
              options: [
                { value: 10, label: '10' },
                { value: 25, label: '25' },
                { value: 50, label: '50' },
              ],
            }}
          />
        }
      />

      <CreateQueueModal
        visible={createOpen}
        onDismiss={() => setCreateOpen(false)}
        onCreated={(name) => {
          addSuccess(copy.sqs.createSuccess(name))
          setCreateOpen(false)
        }}
        onFailed={(msg) => addError(copy.sqs.createErrorHeader + ': ' + msg)}
      />

      <DeleteQueueModal
        visible={deleteTarget !== null}
        queueName={deleteTarget?.queueName ?? ''}
        queueUrl={deleteTarget?.queueUrl ?? ''}
        onDismiss={() => setDeleteTarget(null)}
        onDeleted={(name) => {
          addSuccess(copy.sqs.deleteSuccess(name))
          setDeleteTarget(null)
          setSelected(null)
        }}
        onFailed={(name, err) => {
          addError(`Delete ${name} failed: ${err.message}`)
          setDeleteTarget(null)
        }}
      />
    </SpaceBetween>
  )
}
