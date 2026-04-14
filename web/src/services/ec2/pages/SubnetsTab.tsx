/**
 * SubnetsTab — EC2 Subnet management page.
 *
 * Features:
 *   - 7-column table: Name, Subnet ID, State, VPC ID, IPv4 CIDR, AZ, Available IPs
 *   - Create Subnet modal with Name tag, VPC (select from list), AZ, CIDR block
 *   - Delete Subnet with type-to-confirm modal
 *   - Row click opens SplitPanel (flat detail view)
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

import type { Ec2Subnet } from '../api/types'
import { useSubnets, useCreateSubnet, useDeleteSubnet } from '../api/subnets'
import { useVpcs } from '../api/vpcs'
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
// CIDR validation (T-02-11)
// ---------------------------------------------------------------------------
const CIDR_REGEX = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/

// ---------------------------------------------------------------------------
// Available AZ options
// ---------------------------------------------------------------------------
const AZ_OPTIONS = [
  { label: 'us-east-1a', value: 'us-east-1a' },
  { label: 'us-east-1b', value: 'us-east-1b' },
  { label: 'us-east-1c', value: 'us-east-1c' },
  { label: 'us-east-1d', value: 'us-east-1d' },
]

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------
const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2Subnet>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || '-',
    sortingField: 'nameTag',
    minWidth: 160,
  },
  {
    id: 'subnetId',
    header: 'Subnet ID',
    cell: (item) => item.subnetId,
    sortingField: 'subnetId',
    width: 180,
  },
  {
    id: 'state',
    header: 'State',
    cell: (item) => <StatusBadge state={item.state} />,
    sortingField: 'state',
    width: 120,
  },
  {
    id: 'vpcId',
    header: 'VPC ID',
    cell: (item) => item.vpcId || '-',
    sortingField: 'vpcId',
    width: 180,
  },
  {
    id: 'cidrBlock',
    header: 'IPv4 CIDR',
    cell: (item) => item.cidrBlock,
    sortingField: 'cidrBlock',
    width: 140,
  },
  {
    id: 'availabilityZone',
    header: 'AZ',
    cell: (item) => item.availabilityZone,
    sortingField: 'availabilityZone',
    width: 130,
  },
  {
    id: 'availableIpAddressCount',
    header: 'Available IPs',
    cell: (item) => item.availableIpAddressCount,
    sortingField: 'availableIpAddressCount',
    width: 110,
  },
]

// ---------------------------------------------------------------------------
// Filtering properties
// ---------------------------------------------------------------------------
const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  {
    key: 'subnetId',
    propertyLabel: 'Subnet ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Subnet ID values',
  },
  {
    key: 'vpcId',
    propertyLabel: 'VPC ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'VPC ID values',
  },
  {
    key: 'state',
    propertyLabel: 'State',
    operators: ['=', '!='],
    groupValuesLabel: 'State values',
  },
  {
    key: 'availabilityZone',
    propertyLabel: 'AZ',
    operators: ['=', '!='],
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
// SplitPanel detail content (flat)
// ---------------------------------------------------------------------------
function SubnetDetailPanel({ subnet }: { subnet: Ec2Subnet }) {
  return (
    <SplitPanelDetail
      header={subnet.subnetId}
      keyValueItems={[
        { label: 'Subnet ID', value: subnet.subnetId },
        { label: 'State', value: <StatusBadge state={subnet.state} /> },
        { label: 'VPC ID', value: subnet.vpcId || '-' },
        { label: 'IPv4 CIDR', value: subnet.cidrBlock },
        { label: 'Availability Zone', value: subnet.availabilityZone },
        { label: 'Available IPv4 addresses', value: subnet.availableIpAddressCount },
        { label: 'Map public IP on launch', value: subnet.mapPublicIpOnLaunch ? 'Yes' : 'No' },
        { label: 'Name', value: subnet.nameTag || '-' },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// SubnetsTab component
// ---------------------------------------------------------------------------
export default function SubnetsTab() {
  const queryClient = useQueryClient()
  const { data: subnets = [], isLoading } = useSubnets()
  const { data: vpcs = [] } = useVpcs()
  const [selectedItems, setSelectedItems] = useState<Ec2Subnet[]>([])

  // Create modal state
  const [createVisible, setCreateVisible] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createVpcId, setCreateVpcId] = useState<string | null>(null)
  const [createAz, setCreateAz] = useState<string | null>(null)
  const [createCidr, setCreateCidr] = useState('')
  const [createCidrError, setCreateCidrError] = useState('')
  const [createVpcError, setCreateVpcError] = useState('')
  const [createAzError, setCreateAzError] = useState('')

  // Delete modal state
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Ec2Subnet | null>(null)

  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const { setPanel } = useSplitPanel()

  const createMutation = useCreateSubnet()
  const deleteMutation = useDeleteSubnet()

  // ----- refresh -----
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'subnets'] })
  }, [queryClient])

  // ----- row click -----
  const handleRowClick = useCallback(
    (subnet: Ec2Subnet) => {
      setPanel(<SubnetDetailPanel subnet={subnet} />, subnet.subnetId)
    },
    [setPanel],
  )

  // ----- create -----
  const openCreate = () => {
    setCreateName('')
    setCreateVpcId(null)
    setCreateAz(null)
    setCreateCidr('')
    setCreateCidrError('')
    setCreateVpcError('')
    setCreateAzError('')
    setCreateVisible(true)
  }

  const handleCreate = useCallback(async () => {
    let valid = true
    if (!createVpcId) {
      setCreateVpcError('Select a VPC')
      valid = false
    } else {
      setCreateVpcError('')
    }
    if (!createAz) {
      setCreateAzError('Select an Availability Zone')
      valid = false
    } else {
      setCreateAzError('')
    }
    if (!CIDR_REGEX.test(createCidr)) {
      setCreateCidrError('Enter a valid CIDR block (e.g. 10.0.1.0/24)')
      valid = false
    } else {
      setCreateCidrError('')
    }
    if (!valid) return

    try {
      await createMutation.mutateAsync({
        vpcId: createVpcId as string,
        cidrBlock: createCidr,
        availabilityZone: createAz as string,
        nameTag: createName.trim() || undefined,
      })
      addSuccess(`Subnet created with CIDR ${createCidr}.`)
      setCreateVisible(false)
    } catch (err) {
      addError(`Failed to create subnet: ${String(err)}`)
    }
  }, [createVpcId, createAz, createCidr, createName, createMutation, addSuccess, addError])

  // ----- delete -----
  const openDelete = () => {
    if (selectedItems.length === 0) return
    setDeleteTarget(selectedItems[0])
    setDeleteVisible(true)
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.subnetId)
      addSuccess(`Subnet ${deleteTarget.subnetId} deleted.`)
      setDeleteVisible(false)
      setDeleteTarget(null)
      setSelectedItems([])
    } catch (err) {
      addError(`Failed to delete subnet: ${String(err)}`)
      setDeleteVisible(false)
    }
  }, [deleteTarget, deleteMutation, addSuccess, addError])

  // ----- VPC select options -----
  const vpcOptions = vpcs.map((vpc) => ({
    label: vpc.nameTag ? `${vpc.nameTag} (${vpc.vpcId})` : vpc.vpcId,
    value: vpc.vpcId,
  }))

  const selectedVpcOption = vpcOptions.find((o) => o.value === createVpcId) ?? null

  return (
    <>
      <FlashNotifications items={flashItems} />

      <ResourceTable
        items={subnets}
        loading={isLoading}
        columnDefinitions={COLUMN_DEFINITIONS}
        resourceType="subnets"
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
              ariaLabel="Refresh subnets"
            />
            <Button
              disabled={selectedItems.length === 0 || deleteMutation.isPending}
              onClick={openDelete}
            >
              Delete subnet
            </Button>
            <Button variant="primary" onClick={openCreate}>
              Create subnet
            </Button>
          </SpaceBetween>
        }
      />

      {/* Create Subnet modal */}
      <CreateModal
        visible={createVisible}
        header="Create subnet"
        onDismiss={() => setCreateVisible(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
        submitLabel="Create subnet"
      >
        <FormField label="Name tag (optional)">
          <Input
            value={createName}
            onChange={({ detail }) => setCreateName(detail.value)}
            placeholder="my-subnet"
          />
        </FormField>
        <FormField
          label={
            <>
              VPC <Box display="inline" color="text-status-error">*</Box>
            </>
          }
          errorText={createVpcError}
        >
          <Select
            selectedOption={selectedVpcOption}
            onChange={({ detail }) => {
              setCreateVpcId(detail.selectedOption.value ?? null)
              if (createVpcError) setCreateVpcError('')
            }}
            options={vpcOptions}
            placeholder="Select a VPC"
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
            selectedOption={AZ_OPTIONS.find((o) => o.value === createAz) ?? null}
            onChange={({ detail }) => {
              setCreateAz(detail.selectedOption.value ?? null)
              if (createAzError) setCreateAzError('')
            }}
            options={AZ_OPTIONS}
            placeholder="Select AZ"
          />
        </FormField>
        <FormField
          label={
            <>
              IPv4 CIDR block <Box display="inline" color="text-status-error">*</Box>
            </>
          }
          errorText={createCidrError}
        >
          <Input
            value={createCidr}
            onChange={({ detail }) => {
              setCreateCidr(detail.value)
              if (createCidrError) setCreateCidrError('')
            }}
            placeholder="10.0.1.0/24"
          />
        </FormField>
      </CreateModal>

      {/* Delete Subnet modal */}
      {deleteTarget && (
        <DeleteModal
          visible={deleteVisible}
          resourceType="subnet"
          resourceId={deleteTarget.subnetId}
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
