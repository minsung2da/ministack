/**
 * InternetGatewaysTab — EC2 Internet Gateway management page.
 *
 * Features:
 *   - 4-column table: Name, IGW ID, State (StatusBadge), VPC ID
 *   - Create IGW modal with Name tag (optional)
 *   - Delete with type-to-confirm modal
 *   - Row click opens SplitPanel with IGW details
 *   - Flashbar success/error feedback
 */

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TableProps } from '@cloudscape-design/components/table'
import type { PropertyFilterProps } from '@cloudscape-design/components/property-filter'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'

import type { Ec2InternetGateway } from '../api/types'
import {
  useInternetGateways,
  useCreateInternetGateway,
  useDeleteInternetGateway,
} from '../api/internetGateways'
import { ResourceTable } from '../components/ResourceTable'
import { StatusBadge } from '../components/StatusBadge'
import { CreateModal } from '../components/CreateModal'
import { DeleteModal } from '../components/DeleteModal'
import { SplitPanelDetail } from '../components/SplitPanelDetail'
import {
  useFlashNotifications,
  FlashNotifications,
} from '../components/FlashNotifications'
import { useSplitPanel } from '../../../contexts/SplitPanelContext'

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------
const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2InternetGateway>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || '-',
    sortingField: 'nameTag',
    minWidth: 160,
  },
  {
    id: 'internetGatewayId',
    header: 'IGW ID',
    cell: (item) => item.internetGatewayId,
    sortingField: 'internetGatewayId',
    width: 200,
  },
  {
    id: 'state',
    header: 'State',
    cell: (item) => (
      <StatusBadge state={item.attachedVpcId ? item.attachmentState : 'detached'} />
    ),
    sortingField: 'attachmentState',
    width: 120,
  },
  {
    id: 'vpcId',
    header: 'VPC ID',
    cell: (item) => item.attachedVpcId || '-',
    sortingField: 'attachedVpcId',
    minWidth: 180,
  },
]

// ---------------------------------------------------------------------------
// Filtering properties
// ---------------------------------------------------------------------------
const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  {
    key: 'internetGatewayId',
    propertyLabel: 'IGW ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'IGW ID values',
  },
  {
    key: 'attachedVpcId',
    propertyLabel: 'VPC ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'VPC ID values',
  },
  {
    key: 'attachmentState',
    propertyLabel: 'State',
    operators: ['=', '!='],
    groupValuesLabel: 'State values',
  },
  {
    key: 'nameTag',
    propertyLabel: 'Name',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Name values',
  },
]

// ---------------------------------------------------------------------------
// SplitPanel detail content
// ---------------------------------------------------------------------------
function IgwDetailPanel({ igw }: { igw: Ec2InternetGateway }) {
  const state = igw.attachedVpcId ? igw.attachmentState : 'detached'

  return (
    <SplitPanelDetail
      header={igw.internetGatewayId}
      keyValueItems={[
        { label: 'IGW ID', value: igw.internetGatewayId },
        { label: 'State', value: <StatusBadge state={state} /> },
        { label: 'VPC ID', value: igw.attachedVpcId || '-' },
        { label: 'Name', value: igw.nameTag || '-' },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// InternetGatewaysTab component
// ---------------------------------------------------------------------------
export default function InternetGatewaysTab() {
  const queryClient = useQueryClient()
  const { data: igws = [], isLoading } = useInternetGateways()
  const [selectedItems, setSelectedItems] = useState<Ec2InternetGateway[]>([])

  // Create modal state
  const [createVisible, setCreateVisible] = useState(false)
  const [createName, setCreateName] = useState('')

  // Delete modal state
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Ec2InternetGateway | null>(null)

  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const { setPanel } = useSplitPanel()

  const createMutation = useCreateInternetGateway()
  const deleteMutation = useDeleteInternetGateway()

  // ----- refresh -----
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'internet-gateways'] })
  }, [queryClient])

  // ----- row click -----
  const handleRowClick = useCallback(
    (igw: Ec2InternetGateway) => {
      setPanel(<IgwDetailPanel igw={igw} />, igw.internetGatewayId)
    },
    [setPanel],
  )

  // ----- create -----
  const openCreate = () => {
    setCreateName('')
    setCreateVisible(true)
  }

  const handleCreate = useCallback(async () => {
    try {
      await createMutation.mutateAsync({ nameTag: createName.trim() || undefined })
      addSuccess('Internet Gateway created.')
      setCreateVisible(false)
    } catch (err) {
      addError(`Failed to create Internet Gateway: ${String(err)}`)
    }
  }, [createName, createMutation, addSuccess, addError])

  // ----- delete -----
  const openDelete = () => {
    if (selectedItems.length === 0) return
    setDeleteTarget(selectedItems[0])
    setDeleteVisible(true)
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.internetGatewayId)
      addSuccess(`Internet Gateway ${deleteTarget.internetGatewayId} deleted.`)
      setDeleteVisible(false)
      setDeleteTarget(null)
      setSelectedItems([])
    } catch (err) {
      addError(`Failed to delete Internet Gateway: ${String(err)}`)
      setDeleteVisible(false)
    }
  }, [deleteTarget, deleteMutation, addSuccess, addError])

  return (
    <>
      <FlashNotifications items={flashItems} />

      <ResourceTable
        items={igws}
        loading={isLoading}
        columnDefinitions={COLUMN_DEFINITIONS}
        resourceType="internet-gateways"
        filteringProperties={FILTERING_PROPERTIES}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        onRowClick={handleRowClick}
        headerActions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              iconName="refresh"
              variant="icon"
              onClick={handleRefresh}
              ariaLabel="Refresh Internet Gateways"
            />
            <Button
              disabled={selectedItems.length === 0 || deleteMutation.isPending}
              onClick={openDelete}
            >
              Delete
            </Button>
            <Button variant="primary" onClick={openCreate}>
              Create internet gateway
            </Button>
          </SpaceBetween>
        }
      />

      {/* Create Internet Gateway modal */}
      <CreateModal
        visible={createVisible}
        header="Create internet gateway"
        onDismiss={() => setCreateVisible(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
        submitLabel="Create internet gateway"
      >
        <FormField label="Name tag (optional)">
          <Input
            value={createName}
            onChange={({ detail }) => setCreateName(detail.value)}
            placeholder="my-internet-gateway"
          />
        </FormField>
      </CreateModal>

      {/* Delete Internet Gateway modal */}
      {deleteTarget && (
        <DeleteModal
          visible={deleteVisible}
          resourceType="Internet Gateway"
          resourceId={deleteTarget.internetGatewayId}
          onConfirm={handleDeleteConfirm}
          onDismiss={() => {
            setDeleteVisible(false)
            setDeleteTarget(null)
          }}
          loading={deleteMutation.isPending}
        />
      )}
    </>
  )
}
