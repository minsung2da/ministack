/**
 * SnapshotsTab — EC2 Snapshot management page.
 *
 * Features:
 *   - 6-column table: Name, Snapshot ID, State (StatusBadge), Volume ID, Size (GiB), Started
 *   - Create Snapshot modal with Volume (Select from useVolumes) and Description
 *   - Delete with type-to-confirm modal
 *   - Row click opens SplitPanel with snapshot details
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
import Select from '@cloudscape-design/components/select'
import Box from '@cloudscape-design/components/box'

import type { Ec2Snapshot } from '../api/types'
import { useSnapshots, useCreateSnapshot, useDeleteSnapshot } from '../api/snapshots'
import { useVolumes } from '../api/volumes'
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
const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2Snapshot>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || '-',
    sortingField: 'nameTag',
    minWidth: 160,
  },
  {
    id: 'snapshotId',
    header: 'Snapshot ID',
    cell: (item) => item.snapshotId,
    sortingField: 'snapshotId',
    width: 200,
  },
  {
    id: 'state',
    header: 'State',
    cell: (item) => <StatusBadge state={item.status} />,
    sortingField: 'status',
    width: 120,
  },
  {
    id: 'volumeId',
    header: 'Volume ID',
    cell: (item) => item.volumeId || '-',
    sortingField: 'volumeId',
    width: 180,
  },
  {
    id: 'size',
    header: 'Size (GiB)',
    cell: (item) => String(item.volumeSize),
    sortingField: 'volumeSize',
    width: 100,
  },
  {
    id: 'startTime',
    header: 'Started',
    cell: (item) => item.startTime || '-',
    sortingField: 'startTime',
    minWidth: 180,
  },
]

// ---------------------------------------------------------------------------
// Filtering properties
// ---------------------------------------------------------------------------
const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  {
    key: 'snapshotId',
    propertyLabel: 'Snapshot ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Snapshot ID values',
  },
  {
    key: 'status',
    propertyLabel: 'State',
    operators: ['=', '!='],
    groupValuesLabel: 'State values',
  },
  {
    key: 'volumeId',
    propertyLabel: 'Volume ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Volume ID values',
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
function SnapshotDetailPanel({ snapshot }: { snapshot: Ec2Snapshot }) {
  return (
    <SplitPanelDetail
      header={snapshot.snapshotId}
      keyValueItems={[
        { label: 'Snapshot ID', value: snapshot.snapshotId },
        { label: 'State', value: <StatusBadge state={snapshot.status} /> },
        { label: 'Volume ID', value: snapshot.volumeId || '-' },
        { label: 'Volume size', value: `${snapshot.volumeSize} GiB` },
        { label: 'Started', value: snapshot.startTime || '-' },
        { label: 'Description', value: snapshot.description || '-' },
        { label: 'Name', value: snapshot.nameTag || '-' },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// SnapshotsTab component
// ---------------------------------------------------------------------------
export default function SnapshotsTab() {
  const queryClient = useQueryClient()
  const { data: snapshots = [], isLoading } = useSnapshots()
  const { data: volumes = [] } = useVolumes()
  const [selectedItems, setSelectedItems] = useState<Ec2Snapshot[]>([])

  // Create modal state
  const [createVisible, setCreateVisible] = useState(false)
  const [createVolumeOption, setCreateVolumeOption] = useState<{
    value: string
    label: string
  } | null>(null)
  const [createVolumeError, setCreateVolumeError] = useState('')
  const [createDescription, setCreateDescription] = useState('')

  // Delete modal state
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Ec2Snapshot | null>(null)

  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const { setPanel } = useSplitPanel()

  const createMutation = useCreateSnapshot()
  const deleteMutation = useDeleteSnapshot()

  // Build volume options for the select dropdown
  const volumeOptions = volumes.map((v) => ({
    value: v.volumeId,
    label: v.nameTag ? `${v.volumeId} (${v.nameTag})` : v.volumeId,
    description: `${v.size} GiB ${v.volumeType} — ${v.availabilityZone}`,
  }))

  // ----- refresh -----
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'snapshots'] })
  }, [queryClient])

  // ----- row click -----
  const handleRowClick = useCallback(
    (snapshot: Ec2Snapshot) => {
      setPanel(<SnapshotDetailPanel snapshot={snapshot} />, snapshot.snapshotId)
    },
    [setPanel],
  )

  // ----- create -----
  const openCreate = () => {
    setCreateVolumeOption(null)
    setCreateVolumeError('')
    setCreateDescription('')
    setCreateVisible(true)
  }

  const handleCreate = useCallback(async () => {
    if (!createVolumeOption) {
      setCreateVolumeError('Select a source volume.')
      return
    }
    setCreateVolumeError('')
    try {
      await createMutation.mutateAsync({
        volumeId: createVolumeOption.value,
        description: createDescription.trim() || undefined,
      })
      addSuccess(`Snapshot of volume ${createVolumeOption.value} started.`)
      setCreateVisible(false)
    } catch (err) {
      addError(`Failed to create snapshot: ${String(err)}`)
    }
  }, [createVolumeOption, createDescription, createMutation, addSuccess, addError])

  // ----- delete -----
  const openDelete = () => {
    if (selectedItems.length === 0) return
    setDeleteTarget(selectedItems[0])
    setDeleteVisible(true)
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.snapshotId)
      addSuccess(`Snapshot ${deleteTarget.snapshotId} deleted.`)
      setDeleteVisible(false)
      setDeleteTarget(null)
      setSelectedItems([])
    } catch (err) {
      addError(`Failed to delete snapshot: ${String(err)}`)
      setDeleteVisible(false)
    }
  }, [deleteTarget, deleteMutation, addSuccess, addError])

  return (
    <>
      <FlashNotifications items={flashItems} />

      <ResourceTable
        items={snapshots}
        loading={isLoading}
        columnDefinitions={COLUMN_DEFINITIONS}
        resourceType="snapshots"
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
              ariaLabel="Refresh snapshots"
            />
            <Button
              disabled={selectedItems.length === 0 || deleteMutation.isPending}
              onClick={openDelete}
            >
              Delete
            </Button>
            <Button variant="primary" onClick={openCreate}>
              Create snapshot
            </Button>
          </SpaceBetween>
        }
      />

      {/* Create snapshot modal */}
      <CreateModal
        visible={createVisible}
        header="Create snapshot"
        onDismiss={() => setCreateVisible(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
        submitLabel="Create snapshot"
      >
        <FormField
          label={
            <>
              Volume <Box display="inline" color="text-status-error">*</Box>
            </>
          }
          errorText={createVolumeError}
          description="Select the volume to snapshot."
        >
          <Select
            selectedOption={createVolumeOption}
            onChange={({ detail }) => {
              setCreateVolumeOption(
                detail.selectedOption as { value: string; label: string },
              )
              if (createVolumeError) setCreateVolumeError('')
            }}
            options={volumeOptions}
            placeholder="Select a volume"
            statusType={volumes.length === 0 ? 'loading' : 'finished'}
            loadingText="Loading volumes..."
          />
        </FormField>
        <FormField label="Description (optional)">
          <Input
            value={createDescription}
            onChange={({ detail }) => setCreateDescription(detail.value)}
            placeholder="My snapshot description"
          />
        </FormField>
      </CreateModal>

      {/* Delete snapshot modal */}
      {deleteTarget && (
        <DeleteModal
          visible={deleteVisible}
          resourceType="Snapshot"
          resourceId={deleteTarget.snapshotId}
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
