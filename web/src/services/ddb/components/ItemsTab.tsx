import { useMemo, useState, useEffect } from 'react'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ButtonDropdown from '@cloudscape-design/components/button-dropdown'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Table from '@cloudscape-design/components/table'
import Header from '@cloudscape-design/components/header'
import Alert from '@cloudscape-design/components/alert'
import { useScan } from '../api/useScan'
import { buildItemColumns } from './columns'
import { PutItemModal } from './PutItemModal'
import { DeleteItemModal } from './DeleteItemModal'
import { useSplitPanel } from '../../../contexts/SplitPanelContext'
import { renderAttributeValue } from '../api/attributeValue'
import {
  useFlashNotifications,
  FlashNotifications,
} from '../../ec2/components/FlashNotifications'
import { copy } from '../../../shared/copy'
import type {
  DdbItem,
  DdbTableDescription,
} from '../../../shared/types/ddb'

type TableDescriptionWithKeys = DdbTableDescription & {
  hashKey: string | null
  sortKey: string | null
}

type Props = {
  tableDescription: TableDescriptionWithKeys
}

/**
 * ItemsTab [DDB-02] — Scan controls + LEK stack + dynamic columns + SplitPanel.
 *
 * Pitfall 7.2.2: LastEvaluatedKey is a MAP, not a string token. We store the
 * stack as `DdbItem[]`; the current ESK is `stack[stack.length-1]` and is
 * passed verbatim to `useScan`, which forwards it in the request body.
 *
 * Critical invariant: changing the filter RESETS the stack. Passing a stale
 * ESK from a prior filter to a new filter would produce a
 * ValidationException (per Plan 05-RESEARCH.md §7.2.2 / §1.5).
 */
export function ItemsTab({ tableDescription }: Props) {
  const [filterDraft, setFilterDraft] = useState('')
  const [appliedFilter, setAppliedFilter] = useState<string | null>(null)
  // Pitfall 7.2.2: LEK stack. stack[stack.length-1] is the current ESK.
  const [stack, setStack] = useState<DdbItem[]>([])
  const currentEsk = stack.length > 0 ? stack[stack.length - 1] : null

  const { data, isLoading, error, refetch } = useScan(
    tableDescription.TableName,
    appliedFilter,
    currentEsk,
  )
  const items = data?.Items ?? []
  const observedAttrs = useMemo(
    () => Array.from(new Set(items.flatMap((i) => Object.keys(i)))),
    [items],
  )
  const columns = useMemo(
    () => buildItemColumns(tableDescription.KeySchema, observedAttrs),
    [tableDescription.KeySchema, observedAttrs],
  )

  const splitPanel = useSplitPanel()
  const [selected, setSelected] = useState<DdbItem | null>(null)
  const [putTarget, setPutTarget] = useState<'new' | DdbItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DdbItem | null>(null)
  const {
    items: flashItems,
    addSuccess,
    addError,
  } = useFlashNotifications()

  // Clear SplitPanel when switching tables.
  useEffect(() => {
    setSelected(null)
  }, [tableDescription.TableName])

  // Compose the itemKey (KeySchema-only attribute subset) from a selected row.
  const toItemKey = (row: DdbItem): DdbItem => {
    const out: DdbItem = {}
    for (const k of tableDescription.KeySchema) {
      if (row[k.AttributeName] !== undefined) {
        out[k.AttributeName] = row[k.AttributeName]
      }
    }
    return out
  }

  const selectedKeyString = selected
    ? Object.values(toItemKey(selected)).map(renderAttributeValue).join('#')
    : ''

  const runScan = () => {
    // Pitfall 7.2.2: filter change MUST reset LEK stack.
    const next = filterDraft.trim() || null
    setAppliedFilter(next)
    setStack([])
  }
  const onNext = () => {
    if (data?.LastEvaluatedKey) {
      const lek = data.LastEvaluatedKey
      setStack((s) => [...s, lek])
    }
  }
  const onPrev = () => setStack((s) => s.slice(0, -1))

  const openSplitPanel = (row: DdbItem) => {
    splitPanel.setPanel(
      <Box padding="m">
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '12px',
            margin: 0,
          }}
        >
          {JSON.stringify(row, null, 2)}
        </pre>
      </Box>,
      'Item details',
    )
  }

  return (
    <SpaceBetween size="m">
      <FlashNotifications items={flashItems} />
      <SpaceBetween direction="horizontal" size="s">
        <FormField label={copy.ddb.itemsScanFilterLabel}>
          <Input
            value={filterDraft}
            onChange={({ detail }) => setFilterDraft(detail.value)}
            placeholder={copy.ddb.itemsScanFilterPlaceholder}
          />
        </FormField>
        <Box padding={{ top: 'l' }}>
          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={runScan}>{copy.ddb.itemsScanRunButton}</Button>
            <Button
              iconName="refresh"
              variant="icon"
              onClick={() => void refetch()}
              ariaLabel={copy.ddb.refreshTooltip}
            />
          </SpaceBetween>
        </Box>
      </SpaceBetween>

      {error && (
        <Alert type="error">
          {copy.ddb.itemsScanError((error as Error).message)}
        </Alert>
      )}

      <Table
        items={items}
        loading={isLoading}
        loadingText="Scanning"
        columnDefinitions={columns}
        selectionType="single"
        selectedItems={selected ? [selected] : []}
        variant="embedded"
        onSelectionChange={({ detail }) => {
          const row = detail.selectedItems[0] ?? null
          setSelected(row)
          if (row) openSplitPanel(row)
        }}
        header={
          <Header
            counter={`(${items.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="primary"
                  onClick={() => setPutTarget('new')}
                >
                  {copy.ddb.itemsPutButton}
                </Button>
                <ButtonDropdown
                  items={[
                    {
                      id: 'edit',
                      text: copy.ddb.itemsEditButton,
                      disabled: !selected,
                    },
                    {
                      id: 'delete',
                      text: copy.ddb.itemsDeleteButton,
                      disabled: !selected,
                    },
                  ]}
                  onItemClick={({ detail }) => {
                    if (!selected) return
                    if (detail.id === 'edit') setPutTarget(selected)
                    else if (detail.id === 'delete')
                      setDeleteTarget(selected)
                  }}
                >
                  {copy.ddb.actionsDropdownButton}
                </ButtonDropdown>
              </SpaceBetween>
            }
          >
            {copy.ddb.itemsHeading}
          </Header>
        }
        empty={
          <Box padding="m" textAlign="center">
            {copy.ddb.itemsEmpty}
          </Box>
        }
      />

      <SpaceBetween direction="horizontal" size="xs">
        <Button disabled={stack.length === 0} onClick={onPrev}>
          {copy.ddb.itemsPrevButton}
        </Button>
        <Button disabled={!data?.LastEvaluatedKey} onClick={onNext}>
          {copy.ddb.itemsNextButton}
        </Button>
      </SpaceBetween>

      {putTarget !== null && (
        <PutItemModal
          visible={putTarget !== null}
          tableDescription={tableDescription}
          initialItem={
            putTarget === 'new' ? undefined : (putTarget as DdbItem)
          }
          initialHeader={
            putTarget === 'new'
              ? copy.ddb.createItemHeader
              : copy.ddb.editItemHeader(selectedKeyString)
          }
          onDismiss={() => setPutTarget(null)}
          onSaved={() => {
            setPutTarget(null)
            addSuccess(copy.ddb.itemSaveSuccess)
          }}
          onFailed={(msg) => addError(copy.ddb.itemSaveFailure(msg))}
        />
      )}

      {deleteTarget && (
        <DeleteItemModal
          visible={deleteTarget !== null}
          tableDescription={tableDescription}
          itemKey={toItemKey(deleteTarget)}
          onDismiss={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null)
            setSelected(null)
            addSuccess(copy.ddb.deleteItemSuccess)
          }}
          onFailed={(msg) => addError(copy.ddb.deleteItemFailure(msg))}
        />
      )}
    </SpaceBetween>
  )
}
