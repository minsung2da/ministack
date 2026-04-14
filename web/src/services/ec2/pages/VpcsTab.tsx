/**
 * VpcsTab — EC2 VPC management page.
 *
 * Features:
 *   - 5-column table: Name, VPC ID, State, IPv4 CIDR, Is default
 *   - Create VPC modal with Name tag and CIDR block (required, regex validated)
 *   - Delete VPC with type-to-confirm modal
 *   - Row click opens SplitPanel with tabs: Details, CIDR blocks, Tags
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
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Box from '@cloudscape-design/components/box'

import type { Ec2Vpc } from '../api/types'
import { useVpcs, useCreateVpc, useDeleteVpc } from '../api/vpcs'
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
// Column definitions
// ---------------------------------------------------------------------------
const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2Vpc>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || '-',
    sortingField: 'nameTag',
    minWidth: 180,
  },
  {
    id: 'vpcId',
    header: 'VPC ID',
    cell: (item) => item.vpcId,
    sortingField: 'vpcId',
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
    id: 'cidrBlock',
    header: 'IPv4 CIDR',
    cell: (item) => item.cidrBlock,
    sortingField: 'cidrBlock',
    width: 140,
  },
  {
    id: 'isDefault',
    header: 'Is default',
    cell: (item) => (item.isDefault ? 'Yes' : 'No'),
    sortingField: 'isDefault',
    width: 100,
  },
]

// ---------------------------------------------------------------------------
// Filtering properties
// ---------------------------------------------------------------------------
const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
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
    key: 'cidrBlock',
    propertyLabel: 'IPv4 CIDR',
    operators: ['=', ':', '!:'],
    groupValuesLabel: 'CIDR values',
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
function VpcDetailPanel({ vpc }: { vpc: Ec2Vpc }) {
  return (
    <SplitPanelDetail
      header={vpc.vpcId}
      tabs={[
        {
          id: 'details',
          label: 'Details',
          content: (
            <Box padding="m">
              <KeyValuePairs
                columns={2}
                items={[
                  { label: 'VPC ID', value: vpc.vpcId },
                  { label: 'State', value: <StatusBadge state={vpc.state} /> },
                  { label: 'IPv4 CIDR', value: vpc.cidrBlock || '-' },
                  { label: 'Is default', value: vpc.isDefault ? 'Yes' : 'No' },
                  { label: 'DHCP options set', value: vpc.dhcpOptionsId || '-' },
                  { label: 'Tenancy', value: vpc.instanceTenancy || '-' },
                ]}
              />
            </Box>
          ),
        },
        {
          id: 'cidr-blocks',
          label: 'CIDR blocks',
          content: (
            <Box padding="m">
              {vpc.cidrBlockAssociations.length > 0 ? (
                vpc.cidrBlockAssociations.map((assoc, i) => (
                  <Box key={i} variant="p">
                    {assoc.cidrBlock} — {assoc.state}
                  </Box>
                ))
              ) : (
                <Box color="text-body-secondary">No CIDR block associations.</Box>
              )}
            </Box>
          ),
        },
        {
          id: 'tags',
          label: 'Tags',
          content: (
            <Box padding="m">
              {vpc.nameTag ? (
                <KeyValuePairs
                  columns={2}
                  items={[{ label: 'Name', value: vpc.nameTag }]}
                />
              ) : (
                <Box color="text-body-secondary">No tags associated with this VPC.</Box>
              )}
            </Box>
          ),
        },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// VpcsTab component
// ---------------------------------------------------------------------------
export default function VpcsTab() {
  const queryClient = useQueryClient()
  const { data: vpcs = [], isLoading } = useVpcs()
  const [selectedItems, setSelectedItems] = useState<Ec2Vpc[]>([])

  // Create modal state
  const [createVisible, setCreateVisible] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createCidr, setCreateCidr] = useState('')
  const [createCidrError, setCreateCidrError] = useState('')

  // Delete modal state
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Ec2Vpc | null>(null)

  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const { setPanel } = useSplitPanel()

  const createMutation = useCreateVpc()
  const deleteMutation = useDeleteVpc()

  // ----- refresh -----
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'vpcs'] })
  }, [queryClient])

  // ----- row click -----
  const handleRowClick = useCallback(
    (vpc: Ec2Vpc) => {
      setPanel(<VpcDetailPanel vpc={vpc} />, vpc.vpcId)
    },
    [setPanel],
  )

  // ----- create -----
  const openCreate = () => {
    setCreateName('')
    setCreateCidr('')
    setCreateCidrError('')
    setCreateVisible(true)
  }

  const handleCreate = useCallback(async () => {
    if (!CIDR_REGEX.test(createCidr)) {
      setCreateCidrError('Enter a valid CIDR block (e.g. 10.0.0.0/16)')
      return
    }
    setCreateCidrError('')
    try {
      await createMutation.mutateAsync({
        cidrBlock: createCidr,
        nameTag: createName.trim() || undefined,
      })
      addSuccess(`VPC created with CIDR ${createCidr}.`)
      setCreateVisible(false)
    } catch (err) {
      addError(`Failed to create VPC: ${String(err)}`)
    }
  }, [createCidr, createName, createMutation, addSuccess, addError])

  // ----- delete -----
  const openDelete = () => {
    if (selectedItems.length === 0) return
    setDeleteTarget(selectedItems[0])
    setDeleteVisible(true)
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.vpcId)
      addSuccess(`VPC ${deleteTarget.vpcId} deleted.`)
      setDeleteVisible(false)
      setDeleteTarget(null)
      setSelectedItems([])
    } catch (err) {
      addError(`Failed to delete VPC: ${String(err)}`)
      setDeleteVisible(false)
    }
  }, [deleteTarget, deleteMutation, addSuccess, addError])

  return (
    <>
      <FlashNotifications items={flashItems} />

      <ResourceTable
        items={vpcs}
        loading={isLoading}
        columnDefinitions={COLUMN_DEFINITIONS}
        resourceType="vpcs"
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
              ariaLabel="Refresh VPCs"
            />
            <Button
              disabled={selectedItems.length === 0 || deleteMutation.isPending}
              onClick={openDelete}
            >
              Delete VPC
            </Button>
            <Button variant="primary" onClick={openCreate}>
              Create VPC
            </Button>
          </SpaceBetween>
        }
      />

      {/* Create VPC modal */}
      <CreateModal
        visible={createVisible}
        header="Create VPC"
        onDismiss={() => setCreateVisible(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
        submitLabel="Create VPC"
      >
        <FormField label="Name tag (optional)">
          <Input
            value={createName}
            onChange={({ detail }) => setCreateName(detail.value)}
            placeholder="my-vpc"
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
            placeholder="10.0.0.0/16"
          />
        </FormField>
      </CreateModal>

      {/* Delete VPC modal */}
      {deleteTarget && (
        <DeleteModal
          visible={deleteVisible}
          resourceType="VPC"
          resourceId={deleteTarget.vpcId}
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
