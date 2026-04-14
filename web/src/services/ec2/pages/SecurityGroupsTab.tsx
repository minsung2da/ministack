/**
 * SecurityGroupsTab — EC2 Security Group management page.
 *
 * Features:
 *   - 6-column table: Name, SG ID, VPC ID, Description, Inbound rules count, Outbound rules count
 *   - Create SG modal with Name, Description, VPC (select)
 *   - Delete SG with type-to-confirm modal
 *   - Row click opens SplitPanel with tabs: Details, Inbound rules, Outbound rules, Tags
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
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Box from '@cloudscape-design/components/box'
import Table from '@cloudscape-design/components/table'

import type { Ec2SecurityGroup } from '../api/types'
import {
  useSecurityGroups,
  useCreateSecurityGroup,
  useDeleteSecurityGroup,
} from '../api/securityGroups'
import { useVpcs } from '../api/vpcs'
import { ResourceTable } from '../components/ResourceTable'
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
const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2SecurityGroup>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || item.groupName || '-',
    sortingField: 'nameTag',
    minWidth: 180,
  },
  {
    id: 'groupId',
    header: 'Security group ID',
    cell: (item) => item.groupId,
    sortingField: 'groupId',
    width: 180,
  },
  {
    id: 'vpcId',
    header: 'VPC ID',
    cell: (item) => item.vpcId || '-',
    sortingField: 'vpcId',
    width: 180,
  },
  {
    id: 'groupDescription',
    header: 'Description',
    cell: (item) => item.groupDescription || '-',
    sortingField: 'groupDescription',
    minWidth: 160,
  },
  {
    id: 'inboundRules',
    header: 'Inbound rules',
    cell: (item) => item.inboundRules.length,
    width: 120,
  },
  {
    id: 'outboundRules',
    header: 'Outbound rules',
    cell: (item) => item.outboundRules.length,
    width: 120,
  },
]

// ---------------------------------------------------------------------------
// Filtering properties
// ---------------------------------------------------------------------------
const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  {
    key: 'groupId',
    propertyLabel: 'Security group ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'SG ID values',
  },
  {
    key: 'vpcId',
    propertyLabel: 'VPC ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'VPC ID values',
  },
  {
    key: 'groupName',
    propertyLabel: 'Group name',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Group name values',
  },
  {
    key: 'nameTag',
    propertyLabel: 'Name',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Name values',
  },
]

// ---------------------------------------------------------------------------
// Rule table columns (reused for inbound/outbound)
// ---------------------------------------------------------------------------
const RULE_COLUMNS_INBOUND: TableProps.ColumnDefinition<{
  protocol: string
  portRange: string
  source: string
  description: string
}>[] = [
  { id: 'protocol', header: 'Protocol', cell: (r) => r.protocol || '-', width: 100 },
  { id: 'portRange', header: 'Port range', cell: (r) => r.portRange || '-', width: 120 },
  { id: 'source', header: 'Source', cell: (r) => r.source || '-', minWidth: 160 },
  { id: 'description', header: 'Description', cell: (r) => r.description || '-', minWidth: 160 },
]

const RULE_COLUMNS_OUTBOUND: TableProps.ColumnDefinition<{
  protocol: string
  portRange: string
  destination: string
  description: string
}>[] = [
  { id: 'protocol', header: 'Protocol', cell: (r) => r.protocol || '-', width: 100 },
  { id: 'portRange', header: 'Port range', cell: (r) => r.portRange || '-', width: 120 },
  { id: 'destination', header: 'Destination', cell: (r) => r.destination || '-', minWidth: 160 },
  { id: 'description', header: 'Description', cell: (r) => r.description || '-', minWidth: 160 },
]

// ---------------------------------------------------------------------------
// SplitPanel detail content
// ---------------------------------------------------------------------------
function SecurityGroupDetailPanel({ sg }: { sg: Ec2SecurityGroup }) {
  return (
    <SplitPanelDetail
      header={sg.groupId}
      tabs={[
        {
          id: 'details',
          label: 'Details',
          content: (
            <Box padding="m">
              <KeyValuePairs
                columns={2}
                items={[
                  { label: 'Security group ID', value: sg.groupId },
                  { label: 'Security group name', value: sg.groupName || '-' },
                  { label: 'VPC ID', value: sg.vpcId || '-' },
                  { label: 'Description', value: sg.groupDescription || '-' },
                ]}
              />
            </Box>
          ),
        },
        {
          id: 'inbound-rules',
          label: 'Inbound rules',
          content: (
            <Box padding="m">
              <Table
                items={sg.inboundRules}
                columnDefinitions={RULE_COLUMNS_INBOUND}
                empty={
                  <Box textAlign="center" color="inherit">
                    No inbound rules
                  </Box>
                }
              />
            </Box>
          ),
        },
        {
          id: 'outbound-rules',
          label: 'Outbound rules',
          content: (
            <Box padding="m">
              <Table
                items={sg.outboundRules}
                columnDefinitions={RULE_COLUMNS_OUTBOUND}
                empty={
                  <Box textAlign="center" color="inherit">
                    No outbound rules
                  </Box>
                }
              />
            </Box>
          ),
        },
        {
          id: 'tags',
          label: 'Tags',
          content: (
            <Box padding="m">
              {sg.nameTag ? (
                <KeyValuePairs
                  columns={2}
                  items={[{ label: 'Name', value: sg.nameTag }]}
                />
              ) : (
                <Box color="text-body-secondary">
                  No tags associated with this security group.
                </Box>
              )}
            </Box>
          ),
        },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// SecurityGroupsTab component
// ---------------------------------------------------------------------------
export default function SecurityGroupsTab() {
  const queryClient = useQueryClient()
  const { data: securityGroups = [], isLoading } = useSecurityGroups()
  const { data: vpcs = [] } = useVpcs()
  const [selectedItems, setSelectedItems] = useState<Ec2SecurityGroup[]>([])

  // Create modal state
  const [createVisible, setCreateVisible] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createVpcId, setCreateVpcId] = useState<string | null>(null)
  const [createNameError, setCreateNameError] = useState('')
  const [createDescError, setCreateDescError] = useState('')
  const [createVpcError, setCreateVpcError] = useState('')

  // Delete modal state
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Ec2SecurityGroup | null>(null)

  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const { setPanel } = useSplitPanel()

  const createMutation = useCreateSecurityGroup()
  const deleteMutation = useDeleteSecurityGroup()

  // ----- refresh -----
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'security-groups'] })
  }, [queryClient])

  // ----- row click -----
  const handleRowClick = useCallback(
    (sg: Ec2SecurityGroup) => {
      setPanel(<SecurityGroupDetailPanel sg={sg} />, sg.groupId)
    },
    [setPanel],
  )

  // ----- create -----
  const openCreate = () => {
    setCreateName('')
    setCreateDescription('')
    setCreateVpcId(null)
    setCreateNameError('')
    setCreateDescError('')
    setCreateVpcError('')
    setCreateVisible(true)
  }

  const handleCreate = useCallback(async () => {
    let valid = true
    if (!createName.trim()) {
      setCreateNameError('Enter a security group name')
      valid = false
    } else {
      setCreateNameError('')
    }
    if (!createDescription.trim()) {
      setCreateDescError('Enter a description')
      valid = false
    } else {
      setCreateDescError('')
    }
    if (!createVpcId) {
      setCreateVpcError('Select a VPC')
      valid = false
    } else {
      setCreateVpcError('')
    }
    if (!valid) return

    try {
      await createMutation.mutateAsync({
        groupName: createName.trim(),
        groupDescription: createDescription.trim(),
        vpcId: createVpcId as string,
      })
      addSuccess(`Security group "${createName}" created.`)
      setCreateVisible(false)
    } catch (err) {
      addError(`Failed to create security group: ${String(err)}`)
    }
  }, [createName, createDescription, createVpcId, createMutation, addSuccess, addError])

  // ----- delete -----
  const openDelete = () => {
    if (selectedItems.length === 0) return
    setDeleteTarget(selectedItems[0])
    setDeleteVisible(true)
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.groupId)
      addSuccess(`Security group ${deleteTarget.groupId} deleted.`)
      setDeleteVisible(false)
      setDeleteTarget(null)
      setSelectedItems([])
    } catch (err) {
      addError(`Failed to delete security group: ${String(err)}`)
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
        items={securityGroups}
        loading={isLoading}
        columnDefinitions={COLUMN_DEFINITIONS}
        resourceType="security-groups"
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
              ariaLabel="Refresh security groups"
            />
            <Button
              disabled={selectedItems.length === 0 || deleteMutation.isPending}
              onClick={openDelete}
            >
              Delete security group
            </Button>
            <Button variant="primary" onClick={openCreate}>
              Create security group
            </Button>
          </SpaceBetween>
        }
      />

      {/* Create Security Group modal */}
      <CreateModal
        visible={createVisible}
        header="Create security group"
        onDismiss={() => setCreateVisible(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
        submitLabel="Create security group"
      >
        <FormField
          label={
            <>
              Security group name <Box display="inline" color="text-status-error">*</Box>
            </>
          }
          errorText={createNameError}
        >
          <Input
            value={createName}
            onChange={({ detail }) => {
              setCreateName(detail.value)
              if (createNameError) setCreateNameError('')
            }}
            placeholder="my-security-group"
          />
        </FormField>
        <FormField
          label={
            <>
              Description <Box display="inline" color="text-status-error">*</Box>
            </>
          }
          errorText={createDescError}
        >
          <Input
            value={createDescription}
            onChange={({ detail }) => {
              setCreateDescription(detail.value)
              if (createDescError) setCreateDescError('')
            }}
            placeholder="My security group"
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
      </CreateModal>

      {/* Delete Security Group modal */}
      {deleteTarget && (
        <DeleteModal
          visible={deleteVisible}
          resourceType="security group"
          resourceId={deleteTarget.groupId}
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
