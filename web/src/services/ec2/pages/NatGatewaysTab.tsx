/**
 * NatGatewaysTab — EC2 NAT Gateway management page.
 *
 * Features:
 *   - 6-column table: Name, NAT GW ID, State (StatusBadge), Subnet ID, Public IP, VPC ID
 *   - Create NAT GW modal: Name tag, Subnet (Select from useSubnets), Elastic IP (Select from useElasticIps, unassociated only)
 *   - Delete with type-to-confirm modal
 *   - Row click opens SplitPanel with NAT GW details
 *   - Flashbar success/error feedback
 */

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TableProps } from '@cloudscape-design/components/table'
import type { PropertyFilterProps } from '@cloudscape-design/components/property-filter'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import FormField from '@cloudscape-design/components/form-field'
import Select from '@cloudscape-design/components/select'
import Box from '@cloudscape-design/components/box'

import type { Ec2NatGateway } from '../api/types'
import { useNatGateways, useCreateNatGateway, useDeleteNatGateway } from '../api/natGateways'
import { useSubnets } from '../api/subnets'
import { useElasticIps } from '../api/elasticIps'
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
const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2NatGateway>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || '-',
    sortingField: 'nameTag',
    minWidth: 160,
  },
  {
    id: 'natGatewayId',
    header: 'NAT GW ID',
    cell: (item) => item.natGatewayId,
    sortingField: 'natGatewayId',
    width: 200,
  },
  {
    id: 'state',
    header: 'State',
    cell: (item) => <StatusBadge state={item.state} />,
    sortingField: 'state',
    width: 120,
  },
  {
    id: 'subnetId',
    header: 'Subnet ID',
    cell: (item) => item.subnetId || '-',
    sortingField: 'subnetId',
    width: 180,
  },
  {
    id: 'publicIp',
    header: 'Public IP',
    cell: (item) => item.publicIp || '-',
    sortingField: 'publicIp',
    width: 140,
  },
  {
    id: 'vpcId',
    header: 'VPC ID',
    cell: (item) => item.vpcId || '-',
    sortingField: 'vpcId',
    minWidth: 180,
  },
]

// ---------------------------------------------------------------------------
// Filtering properties
// ---------------------------------------------------------------------------
const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  {
    key: 'natGatewayId',
    propertyLabel: 'NAT GW ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'NAT GW ID values',
  },
  {
    key: 'state',
    propertyLabel: 'State',
    operators: ['=', '!='],
    groupValuesLabel: 'State values',
  },
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
    key: 'nameTag',
    propertyLabel: 'Name',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Name values',
  },
]

// ---------------------------------------------------------------------------
// SplitPanel detail content
// ---------------------------------------------------------------------------
function NatGatewayDetailPanel({ ngw }: { ngw: Ec2NatGateway }) {
  return (
    <SplitPanelDetail
      header={ngw.natGatewayId}
      keyValueItems={[
        { label: 'NAT GW ID', value: ngw.natGatewayId },
        { label: 'State', value: <StatusBadge state={ngw.state} /> },
        { label: 'Subnet ID', value: ngw.subnetId || '-' },
        { label: 'VPC ID', value: ngw.vpcId || '-' },
        { label: 'Public IP', value: ngw.publicIp || '-' },
        { label: 'Name', value: ngw.nameTag || '-' },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// NatGatewaysTab component
// ---------------------------------------------------------------------------
export default function NatGatewaysTab() {
  const queryClient = useQueryClient()
  const { data: natGateways = [], isLoading } = useNatGateways()
  const { data: subnets = [] } = useSubnets()
  const { data: elasticIps = [] } = useElasticIps()
  const [selectedItems, setSelectedItems] = useState<Ec2NatGateway[]>([])

  // Create modal state
  const [createVisible, setCreateVisible] = useState(false)
  const [createSubnetOption, setCreateSubnetOption] = useState<{
    value: string
    label: string
  } | null>(null)
  const [createSubnetError, setCreateSubnetError] = useState('')
  const [createEipOption, setCreateEipOption] = useState<{
    value: string
    label: string
  } | null>(null)
  const [createEipError, setCreateEipError] = useState('')

  // Delete modal state
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Ec2NatGateway | null>(null)

  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const { setPanel } = useSplitPanel()

  const createMutation = useCreateNatGateway()
  const deleteMutation = useDeleteNatGateway()

  // Build subnet options
  const subnetOptions = subnets.map((s) => ({
    value: s.subnetId,
    label: s.nameTag ? `${s.subnetId} (${s.nameTag})` : s.subnetId,
    description: `${s.cidrBlock} — ${s.availabilityZone}`,
  }))

  // Build EIP options — filter to unassociated (no instanceId / associationId)
  const eipOptions = elasticIps
    .filter((eip) => !eip.associationId && !eip.instanceId)
    .map((eip) => ({
      value: eip.allocationId,
      label: eip.nameTag ? `${eip.allocationId} (${eip.nameTag})` : eip.allocationId,
      description: eip.publicIp,
    }))

  // ----- refresh -----
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'nat-gateways'] })
  }, [queryClient])

  // ----- row click -----
  const handleRowClick = useCallback(
    (ngw: Ec2NatGateway) => {
      setPanel(<NatGatewayDetailPanel ngw={ngw} />, ngw.natGatewayId)
    },
    [setPanel],
  )

  // ----- create -----
  const openCreate = () => {
    setCreateSubnetOption(null)
    setCreateSubnetError('')
    setCreateEipOption(null)
    setCreateEipError('')
    setCreateVisible(true)
  }

  const handleCreate = useCallback(async () => {
    let valid = true

    if (!createSubnetOption) {
      setCreateSubnetError('Select a subnet.')
      valid = false
    } else {
      setCreateSubnetError('')
    }

    if (!createEipOption) {
      setCreateEipError('Select an unassociated Elastic IP address.')
      valid = false
    } else {
      setCreateEipError('')
    }

    if (!valid) return

    try {
      await createMutation.mutateAsync({
        subnetId: createSubnetOption!.value,
        allocationId: createEipOption!.value,
      })
      addSuccess(`NAT Gateway creation initiated in subnet ${createSubnetOption!.value}.`)
      setCreateVisible(false)
    } catch (err) {
      addError(`Failed to create NAT Gateway: ${String(err)}`)
    }
  }, [createSubnetOption, createEipOption, createMutation, addSuccess, addError])

  // ----- delete -----
  const openDelete = () => {
    if (selectedItems.length === 0) return
    setDeleteTarget(selectedItems[0])
    setDeleteVisible(true)
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.natGatewayId)
      addSuccess(`NAT Gateway ${deleteTarget.natGatewayId} deletion initiated.`)
      setDeleteVisible(false)
      setDeleteTarget(null)
      setSelectedItems([])
    } catch (err) {
      addError(`Failed to delete NAT Gateway: ${String(err)}`)
      setDeleteVisible(false)
    }
  }, [deleteTarget, deleteMutation, addSuccess, addError])

  return (
    <>
      <FlashNotifications items={flashItems} />

      <ResourceTable
        items={natGateways}
        loading={isLoading}
        columnDefinitions={COLUMN_DEFINITIONS}
        resourceType="nat-gateways"
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
              ariaLabel="Refresh NAT Gateways"
            />
            <Button
              disabled={selectedItems.length === 0 || deleteMutation.isPending}
              onClick={openDelete}
            >
              Delete
            </Button>
            <Button variant="primary" onClick={openCreate}>
              Create NAT gateway
            </Button>
          </SpaceBetween>
        }
      />

      {/* Create NAT Gateway modal */}
      <CreateModal
        visible={createVisible}
        header="Create NAT gateway"
        onDismiss={() => setCreateVisible(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
        submitLabel="Create NAT gateway"
      >
        <FormField
          label={
            <>
              Subnet <Box display="inline" color="text-status-error">*</Box>
            </>
          }
          errorText={createSubnetError}
          description="Select the subnet where the NAT gateway will reside."
        >
          <Select
            selectedOption={createSubnetOption}
            onChange={({ detail }) => {
              setCreateSubnetOption(
                detail.selectedOption as { value: string; label: string },
              )
              if (createSubnetError) setCreateSubnetError('')
            }}
            options={subnetOptions}
            placeholder="Select a subnet"
            statusType={subnets.length === 0 ? 'loading' : 'finished'}
            loadingText="Loading subnets..."
          />
        </FormField>
        <FormField
          label={
            <>
              Elastic IP allocation ID <Box display="inline" color="text-status-error">*</Box>
            </>
          }
          errorText={createEipError}
          description="Only unassociated Elastic IPs are shown."
        >
          <Select
            selectedOption={createEipOption}
            onChange={({ detail }) => {
              setCreateEipOption(
                detail.selectedOption as { value: string; label: string },
              )
              if (createEipError) setCreateEipError('')
            }}
            options={eipOptions}
            placeholder="Select an Elastic IP"
            statusType={
              elasticIps.length === 0 ? 'loading' : eipOptions.length === 0 ? 'error' : 'finished'
            }
            loadingText="Loading Elastic IPs..."
            errorText={eipOptions.length === 0 && elasticIps.length > 0 ? 'No unassociated Elastic IPs available. Allocate one first.' : undefined}
          />
        </FormField>
      </CreateModal>

      {/* Delete NAT Gateway modal */}
      {deleteTarget && (
        <DeleteModal
          visible={deleteVisible}
          resourceType="NAT Gateway"
          resourceId={deleteTarget.natGatewayId}
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
