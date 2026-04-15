/**
 * VolumesTab — EC2 EBS Volume management page.
 *
 * Features:
 *   - 7-column table: Name, Volume ID, State (StatusBadge), Size (GiB), Volume type, AZ, Attached to
 *   - Create Volume modal with Name tag, Volume type, Size (1-16384 GiB), AZ
 *   - Delete with type-to-confirm modal
 *   - Row click opens SplitPanel with volume details
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

import type { Ec2Volume } from '../api/types'
import { useVolumes, useCreateVolume, useDeleteVolume } from '../api/volumes'
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
// Volume type and AZ options
// ---------------------------------------------------------------------------
const VOLUME_TYPE_OPTIONS = [
  { value: 'gp3', label: 'gp3 — General Purpose SSD' },
  { value: 'gp2', label: 'gp2 — General Purpose SSD (Previous)' },
  { value: 'io1', label: 'io1 — Provisioned IOPS SSD' },
  { value: 'io2', label: 'io2 — Provisioned IOPS SSD (Latest)' },
  { value: 'standard', label: 'standard — Magnetic' },
]

const AZ_OPTIONS = [
  { value: 'us-east-1a', label: 'us-east-1a' },
  { value: 'us-east-1b', label: 'us-east-1b' },
  { value: 'us-east-1c', label: 'us-east-1c' },
  { value: 'us-east-1d', label: 'us-east-1d' },
  { value: 'us-west-2a', label: 'us-west-2a' },
  { value: 'us-west-2b', label: 'us-west-2b' },
  { value: 'eu-west-1a', label: 'eu-west-1a' },
]

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------
const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2Volume>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || '-',
    sortingField: 'nameTag',
    minWidth: 160,
  },
  {
    id: 'volumeId',
    header: 'Volume ID',
    cell: (item) => item.volumeId,
    sortingField: 'volumeId',
    width: 180,
  },
  {
    id: 'state',
    header: 'State',
    cell: (item) => <StatusBadge state={item.status} />,
    sortingField: 'status',
    width: 120,
  },
  {
    id: 'size',
    header: 'Size (GiB)',
    cell: (item) => String(item.size),
    sortingField: 'size',
    width: 100,
  },
  {
    id: 'volumeType',
    header: 'Volume type',
    cell: (item) => item.volumeType || '-',
    sortingField: 'volumeType',
    width: 120,
  },
  {
    id: 'availabilityZone',
    header: 'Availability Zone',
    cell: (item) => item.availabilityZone || '-',
    sortingField: 'availabilityZone',
    width: 160,
  },
  {
    id: 'attachedTo',
    header: 'Attached to',
    cell: (item) => item.attachedInstanceId || '-',
    sortingField: 'attachedInstanceId',
    minWidth: 160,
  },
]

// ---------------------------------------------------------------------------
// Filtering properties
// ---------------------------------------------------------------------------
const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  {
    key: 'volumeId',
    propertyLabel: 'Volume ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Volume ID values',
  },
  {
    key: 'status',
    propertyLabel: 'State',
    operators: ['=', '!='],
    groupValuesLabel: 'State values',
  },
  {
    key: 'volumeType',
    propertyLabel: 'Volume type',
    operators: ['=', '!='],
    groupValuesLabel: 'Volume type values',
  },
  {
    key: 'availabilityZone',
    propertyLabel: 'Availability Zone',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'AZ values',
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
function VolumeDetailPanel({ volume }: { volume: Ec2Volume }) {
  return (
    <SplitPanelDetail
      header={volume.volumeId}
      keyValueItems={[
        { label: 'Volume ID', value: volume.volumeId },
        { label: 'State', value: <StatusBadge state={volume.status} /> },
        { label: 'Size', value: `${volume.size} GiB` },
        { label: 'Volume type', value: volume.volumeType || '-' },
        { label: 'Availability Zone', value: volume.availabilityZone || '-' },
        { label: 'Attached to', value: volume.attachedInstanceId || '-' },
        { label: 'Created', value: volume.createTime || '-' },
        { label: 'Name', value: volume.nameTag || '-' },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// VolumesTab component
// ---------------------------------------------------------------------------
export default function VolumesTab() {
  const queryClient = useQueryClient()
  const { data: volumes = [], isLoading } = useVolumes()
  const [selectedItems, setSelectedItems] = useState<Ec2Volume[]>([])

  // Create modal state
  const [createVisible, setCreateVisible] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createVolumeType, setCreateVolumeType] = useState(VOLUME_TYPE_OPTIONS[0])
  const [createSize, setCreateSize] = useState('8')
  const [createSizeError, setCreateSizeError] = useState('')
  const [createAz, setCreateAz] = useState<{ value: string; label: string } | null>(null)
  const [createAzError, setCreateAzError] = useState('')

  // Delete modal state
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Ec2Volume | null>(null)

  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const { setPanel } = useSplitPanel()

  const createMutation = useCreateVolume()
  const deleteMutation = useDeleteVolume()

  // ----- refresh -----
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'volumes'] })
  }, [queryClient])

  // ----- row click -----
  const handleRowClick = useCallback(
    (volume: Ec2Volume) => {
      setPanel(<VolumeDetailPanel volume={volume} />, volume.volumeId)
    },
    [setPanel],
  )

  // ----- create -----
  const openCreate = () => {
    setCreateName('')
    setCreateVolumeType(VOLUME_TYPE_OPTIONS[0])
    setCreateSize('8')
    setCreateSizeError('')
    setCreateAz(null)
    setCreateAzError('')
    setCreateVisible(true)
  }

  const handleCreate = useCallback(async () => {
    let valid = true

    // Validate size (T-02-14: integer 1-16384)
    const sizeNum = parseInt(createSize, 10)
    if (isNaN(sizeNum) || sizeNum < 1 || sizeNum > 16384 || String(sizeNum) !== createSize.trim()) {
      setCreateSizeError('Size must be an integer between 1 and 16384.')
      valid = false
    } else {
      setCreateSizeError('')
    }

    if (!createAz) {
      setCreateAzError('Availability Zone is required.')
      valid = false
    } else {
      setCreateAzError('')
    }

    if (!valid) return

    try {
      await createMutation.mutateAsync({
        availabilityZone: createAz!.value,
        size: sizeNum,
        volumeType: createVolumeType.value as 'gp2' | 'gp3' | 'io1' | 'io2' | 'standard',
        nameTag: createName.trim() || undefined,
      })
      addSuccess(`Volume of ${sizeNum} GiB (${createVolumeType.value}) created in ${createAz!.value}.`)
      setCreateVisible(false)
    } catch (err) {
      addError(`Failed to create volume: ${String(err)}`)
    }
  }, [createSize, createAz, createVolumeType, createName, createMutation, addSuccess, addError])

  // ----- delete -----
  const openDelete = () => {
    if (selectedItems.length === 0) return
    setDeleteTarget(selectedItems[0])
    setDeleteVisible(true)
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.volumeId)
      addSuccess(`Volume ${deleteTarget.volumeId} deleted.`)
      setDeleteVisible(false)
      setDeleteTarget(null)
      setSelectedItems([])
    } catch (err) {
      addError(`Failed to delete volume: ${String(err)}`)
      setDeleteVisible(false)
    }
  }, [deleteTarget, deleteMutation, addSuccess, addError])

  return (
    <>
      <FlashNotifications items={flashItems} />

      <ResourceTable
        items={volumes}
        loading={isLoading}
        columnDefinitions={COLUMN_DEFINITIONS}
        resourceType="volumes"
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
              ariaLabel="Refresh volumes"
            />
            <Button
              disabled={selectedItems.length === 0 || deleteMutation.isPending}
              onClick={openDelete}
            >
              Delete
            </Button>
            <Button variant="primary" onClick={openCreate}>
              Create volume
            </Button>
          </SpaceBetween>
        }
      />

      {/* Create volume modal */}
      <CreateModal
        visible={createVisible}
        header="Create volume"
        onDismiss={() => setCreateVisible(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
        submitLabel="Create volume"
      >
        <FormField label="Name tag (optional)">
          <Input
            value={createName}
            onChange={({ detail }) => setCreateName(detail.value)}
            placeholder="my-volume"
          />
        </FormField>
        <FormField label="Volume type">
          <Select
            selectedOption={createVolumeType}
            onChange={({ detail }) =>
              setCreateVolumeType(detail.selectedOption as { value: string; label: string })
            }
            options={VOLUME_TYPE_OPTIONS}
          />
        </FormField>
        <FormField
          label={
            <>
              Size (GiB) <Box display="inline" color="text-status-error">*</Box>
            </>
          }
          errorText={createSizeError}
          description="Enter a value between 1 and 16,384 GiB."
        >
          <Input
            value={createSize}
            onChange={({ detail }) => {
              setCreateSize(detail.value)
              if (createSizeError) setCreateSizeError('')
            }}
            inputMode="numeric"
            type="number"
          />
        </FormField>
        <FormField
          label={
            <>
              Availability Zone <Box display="inline" color="text-status-error">*</Box>
            </>
          }
          errorText={createAzError}
        >
          <Select
            selectedOption={createAz}
            onChange={({ detail }) => {
              setCreateAz(detail.selectedOption as { value: string; label: string })
              if (createAzError) setCreateAzError('')
            }}
            options={AZ_OPTIONS}
            placeholder="Select AZ"
          />
        </FormField>
      </CreateModal>

      {/* Delete volume modal */}
      {deleteTarget && (
        <DeleteModal
          visible={deleteVisible}
          resourceType="Volume"
          resourceId={deleteTarget.volumeId}
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
