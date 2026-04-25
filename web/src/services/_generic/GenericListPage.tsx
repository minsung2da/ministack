import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ButtonDropdown from '@cloudscape-design/components/button-dropdown'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Table from '@cloudscape-design/components/table'
import TextFilter from '@cloudscape-design/components/text-filter'
import Alert from '@cloudscape-design/components/alert'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import { useCollection } from '@cloudscape-design/collection-hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useDescriptorList } from './hooks/useGenericList'
import { genericKeys } from './keys'
import { buildColumns } from './components/columnBuilders'
import { GenericCreateModal } from './GenericCreateModal'
import { GenericDeleteModal } from './GenericDeleteModal'
import {
  useFlashNotifications,
  FlashNotifications,
} from '../ec2/components/FlashNotifications'
import { copy } from '../../shared/copy'
import type { ServiceDescriptor } from './types'

type Props = {
  descriptor: ServiceDescriptor
}

/**
 * GenericListPage — descriptor-driven list view (GEN-01).
 *
 * D-02: Create / Delete controls rendered ONLY when the matching mutation
 * spec is declared on the descriptor. KMS (no mutations) shows a list and
 * zero action buttons.
 */
export function GenericListPage({ descriptor }: Props) {
  const query = useDescriptorList<Record<string, unknown>>(
    descriptor.serviceKey,
  )
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { items: flashItems, addSuccess, addError } =
    useFlashNotifications()
  const rows = (query.data ?? []) as Array<Record<string, unknown>>
  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Record<
    string,
    unknown
  > | null>(null)

  const columns = useMemo(
    () => buildColumns(descriptor.list.columns),
    [descriptor.list.columns],
  )

  // D-02: absence of descriptor.mutations.{create|delete} suppresses UI.
  const hasCreate = !!descriptor.mutations?.create
  const hasDelete = !!descriptor.mutations?.delete

  const { items, collectionProps, filterProps } = useCollection(rows, {
    filtering: {
      empty: (
        <Box padding="m" textAlign="center">
          <b>
            {descriptor.list.emptyStateCopy?.title ??
              copy.generic.listEmpty}
          </b>
          {descriptor.list.emptyStateCopy?.subtitle && (
            <Box variant="p">
              {descriptor.list.emptyStateCopy.subtitle}
            </Box>
          )}
        </Box>
      ),
      noMatch: (
        <Box padding="m" textAlign="center">
          <b>No matches</b>
        </Box>
      ),
    },
    selection: {},
  })

  const onRowClick = (row: Record<string, unknown>) => {
    const id = row[descriptor.idField]
    if (typeof id === 'string' && id.length > 0) {
      navigate(`/services/${descriptor.serviceKey}/${encodeURIComponent(id)}`)
    }
  }

  return (
    <SpaceBetween size="l">
      <FlashNotifications items={flashItems} />
      <BreadcrumbGroup
        items={[
          { text: copy.breadcrumbRoot, href: '/_console' },
          { text: descriptor.displayName, href: '' },
        ]}
      />
      <Header variant="h1">{descriptor.displayName}</Header>

      {query.error && (
        <Alert type="error" header="Could not load resources">
          {(query.error as Error).message}
        </Alert>
      )}

      <Table
        {...collectionProps}
        items={items}
        columnDefinitions={columns}
        loading={query.isLoading}
        selectionType="single"
        selectedItems={selected ? [selected] : []}
        trackBy={descriptor.idField}
        onSelectionChange={({ detail }) =>
          setSelected(detail.selectedItems[0] ?? null)
        }
        onRowClick={({ detail }) => onRowClick(detail.item)}
        header={
          <Header
            counter={`(${rows.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  iconName="refresh"
                  variant="icon"
                  onClick={() =>
                    void qc.invalidateQueries({
                      queryKey: genericKeys.list(descriptor.serviceKey),
                    })
                  }
                  ariaLabel={copy.generic.refreshTooltip}
                />
                {hasDelete && (
                  <ButtonDropdown
                    items={[
                      {
                        id: 'delete',
                        text: copy.generic.deleteButton,
                        disabled: !selected,
                      },
                    ]}
                    onItemClick={({ detail }) => {
                      if (detail.id === 'delete' && selected) {
                        setDeleteTarget(selected)
                      }
                    }}
                  >
                    {copy.generic.actionsDropdownButton}
                  </ButtonDropdown>
                )}
                {hasCreate && (
                  <Button
                    variant="primary"
                    onClick={() => setCreateOpen(true)}
                  >
                    {copy.generic.createButton}
                  </Button>
                )}
              </SpaceBetween>
            }
          >
            {descriptor.displayName}
          </Header>
        }
        filter={<TextFilter {...filterProps} />}
      />

      {hasCreate && (
        <GenericCreateModal
          descriptor={descriptor}
          visible={createOpen}
          onDismiss={() => setCreateOpen(false)}
          onSuccess={() => {
            addSuccess(
              descriptor.mutations?.create?.successFlashbar ?? 'Created.',
            )
            setCreateOpen(false)
          }}
          onError={(msg) => addError(msg)}
        />
      )}

      {hasDelete && deleteTarget && (
        <GenericDeleteModal
          descriptor={descriptor}
          row={deleteTarget}
          visible={!!deleteTarget}
          onDismiss={() => setDeleteTarget(null)}
          onSuccess={() => {
            addSuccess(
              descriptor.mutations?.delete?.successFlashbar ?? 'Deleted.',
            )
            setDeleteTarget(null)
            setSelected(null)
          }}
          onError={(msg) => {
            addError(msg)
            setDeleteTarget(null)
          }}
        />
      )}
    </SpaceBetween>
  )
}
