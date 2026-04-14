/**
 * InstancesTab — full EC2 instance management page.
 *
 * Features:
 *   - 8-column sortable/filterable table (PropertyFilter)
 *   - Color-coded status via StatusBadge
 *   - Multi-select with state-aware action ButtonDropdown
 *   - Terminate requires type-to-confirm modal
 *   - Row click opens SplitPanel with 5 tabbed sections
 *   - Flashbar success/error feedback
 *   - Manual refresh button invalidates TanStack Query cache
 */

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TableProps } from '@cloudscape-design/components/table'
import type { PropertyFilterProps } from '@cloudscape-design/components/property-filter'
import ButtonDropdown from '@cloudscape-design/components/button-dropdown'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Box from '@cloudscape-design/components/box'

import type { Ec2Instance } from '../api/types'
import {
  useInstances,
  useStartInstances,
  useStopInstances,
  useTerminateInstances,
  useRebootInstances,
} from '../api/instances'
import { ResourceTable } from '../components/ResourceTable'
import { StatusBadge } from '../components/StatusBadge'
import { DeleteModal } from '../components/DeleteModal'
import { SplitPanelDetail } from '../components/SplitPanelDetail'
import {
  useFlashNotifications,
  FlashNotifications,
} from '../components/FlashNotifications'
import { useSplitPanel } from '../../../contexts/SplitPanelContext'

// ---------------------------------------------------------------------------
// Column definitions (D-02)
// ---------------------------------------------------------------------------

const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2Instance>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || '-',
    sortingField: 'nameTag',
    minWidth: 180,
  },
  {
    id: 'instanceId',
    header: 'Instance ID',
    cell: (item) => item.instanceId,
    sortingField: 'instanceId',
    width: 160,
  },
  {
    id: 'state',
    header: 'Instance state',
    cell: (item) => <StatusBadge state={item.state} />,
    sortingField: 'state',
    width: 120,
  },
  {
    id: 'instanceType',
    header: 'Instance type',
    cell: (item) => item.instanceType,
    sortingField: 'instanceType',
    width: 120,
  },
  {
    id: 'availabilityZone',
    header: 'Availability Zone',
    cell: (item) => item.availabilityZone,
    sortingField: 'availabilityZone',
    width: 140,
  },
  {
    id: 'publicIpAddress',
    header: 'Public IPv4',
    cell: (item) => item.publicIpAddress || '-',
    sortingField: 'publicIpAddress',
    width: 140,
  },
  {
    id: 'privateIpAddress',
    header: 'Private IPv4',
    cell: (item) => item.privateIpAddress || '-',
    sortingField: 'privateIpAddress',
    width: 140,
  },
  {
    id: 'launchTime',
    header: 'Launch time',
    cell: (item) => item.launchTime || '-',
    sortingField: 'launchTime',
    width: 160,
  },
]

// ---------------------------------------------------------------------------
// Filtering properties (D-03)
// ---------------------------------------------------------------------------

const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  {
    key: 'state',
    propertyLabel: 'State',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'State values',
  },
  {
    key: 'instanceType',
    propertyLabel: 'Instance type',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Instance type values',
  },
  {
    key: 'availabilityZone',
    propertyLabel: 'Availability Zone',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Availability Zone values',
  },
  {
    key: 'instanceId',
    propertyLabel: 'Instance ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Instance ID values',
  },
  {
    key: 'nameTag',
    propertyLabel: 'Name',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Name values',
  },
]

// ---------------------------------------------------------------------------
// Action availability helpers (D-15)
// ---------------------------------------------------------------------------

function canStart(instances: Ec2Instance[]): boolean {
  if (instances.length === 0) return false
  return instances.every((i) => i.state === 'stopped')
}

function canStop(instances: Ec2Instance[]): boolean {
  if (instances.length === 0) return false
  return instances.every((i) => i.state === 'running')
}

function canReboot(instances: Ec2Instance[]): boolean {
  if (instances.length === 0) return false
  return instances.every((i) => i.state === 'running')
}

function canTerminate(instances: Ec2Instance[]): boolean {
  if (instances.length === 0) return false
  const terminatable = ['running', 'stopped']
  return instances.every((i) => terminatable.includes(i.state))
}

// ---------------------------------------------------------------------------
// SplitPanel detail content
// ---------------------------------------------------------------------------

function InstanceDetailPanel({ instance }: { instance: Ec2Instance }) {
  return (
    <SplitPanelDetail
      header={instance.instanceId}
      tabs={[
        {
          id: 'details',
          label: 'Details',
          content: (
            <Box padding="m">
              <KeyValuePairs
                columns={2}
                items={[
                  { label: 'Instance ID', value: instance.instanceId },
                  { label: 'AMI ID', value: instance.imageId || '-' },
                  { label: 'Instance type', value: instance.instanceType || '-' },
                  { label: 'Platform', value: instance.platform || 'Linux/UNIX' },
                  { label: 'Launch time', value: instance.launchTime || '-' },
                  { label: 'Key name', value: instance.keyName || '-' },
                  { label: 'Monitoring', value: instance.monitoring || '-' },
                  { label: 'Architecture', value: instance.architecture || '-' },
                ]}
              />
            </Box>
          ),
        },
        {
          id: 'networking',
          label: 'Networking',
          content: (
            <Box padding="m">
              <KeyValuePairs
                columns={2}
                items={[
                  { label: 'VPC ID', value: instance.vpcId || '-' },
                  { label: 'Subnet ID', value: instance.subnetId || '-' },
                  { label: 'Public IPv4', value: instance.publicIpAddress || '-' },
                  { label: 'Private IPv4', value: instance.privateIpAddress || '-' },
                  { label: 'Public DNS', value: instance.publicDnsName || '-' },
                  { label: 'Private DNS', value: instance.privateDnsName || '-' },
                ]}
              />
            </Box>
          ),
        },
        {
          id: 'storage',
          label: 'Storage',
          content: (
            <Box padding="m">
              <KeyValuePairs
                columns={2}
                items={[
                  { label: 'Root device name', value: instance.rootDeviceName || '-' },
                  { label: 'Root device type', value: instance.rootDeviceType || '-' },
                ]}
              />
              {instance.blockDeviceMappings.length > 0 && (
                <Box margin={{ top: 's' }}>
                  <Box variant="awsui-key-label">Block devices</Box>
                  {instance.blockDeviceMappings.map((bdm) => (
                    <Box key={bdm.deviceName} variant="p">
                      {bdm.deviceName}: {bdm.volumeId || '-'}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ),
        },
        {
          id: 'security',
          label: 'Security',
          content: (
            <Box padding="m">
              <KeyValuePairs
                columns={1}
                items={[
                  {
                    label: 'IAM instance profile',
                    value: instance.iamInstanceProfile || '-',
                  },
                  {
                    label: 'Security groups',
                    value:
                      instance.securityGroups.length > 0
                        ? instance.securityGroups
                            .map((sg) => `${sg.groupId} (${sg.groupName})`)
                            .join(', ')
                        : '-',
                  },
                ]}
              />
            </Box>
          ),
        },
        {
          id: 'tags',
          label: 'Tags',
          content: (
            <Box padding="m">
              {instance.nameTag ? (
                <KeyValuePairs
                  columns={2}
                  items={[{ label: 'Name', value: instance.nameTag }]}
                />
              ) : (
                <Box color="text-body-secondary">No tags associated with this instance.</Box>
              )}
            </Box>
          ),
        },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// InstancesTab component
// ---------------------------------------------------------------------------

export default function InstancesTab() {
  const queryClient = useQueryClient()
  const { data: instances = [], isLoading } = useInstances()
  const [selectedItems, setSelectedItems] = useState<Ec2Instance[]>([])
  const [terminateModalVisible, setTerminateModalVisible] = useState(false)

  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const { setPanel } = useSplitPanel()

  const startMutation = useStartInstances()
  const stopMutation = useStopInstances()
  const terminateMutation = useTerminateInstances()
  const rebootMutation = useRebootInstances()

  const isMutating =
    startMutation.isPending ||
    stopMutation.isPending ||
    terminateMutation.isPending ||
    rebootMutation.isPending

  // ----- action handlers -----

  const handleStart = useCallback(async () => {
    const ids = selectedItems.map((i) => i.instanceId)
    try {
      await startMutation.mutateAsync(ids)
      ids.forEach((id) => addSuccess(`Start initiated for instance ${id}.`))
    } catch (err) {
      addError(`Failed to start instances: ${String(err)}`)
    }
  }, [selectedItems, startMutation, addSuccess, addError])

  const handleStop = useCallback(async () => {
    const ids = selectedItems.map((i) => i.instanceId)
    try {
      await stopMutation.mutateAsync(ids)
      ids.forEach((id) => addSuccess(`Stop initiated for instance ${id}.`))
    } catch (err) {
      addError(`Failed to stop instances: ${String(err)}`)
    }
  }, [selectedItems, stopMutation, addSuccess, addError])

  const handleReboot = useCallback(async () => {
    const ids = selectedItems.map((i) => i.instanceId)
    try {
      await rebootMutation.mutateAsync(ids)
      ids.forEach((id) => addSuccess(`Reboot initiated for instance ${id}.`))
    } catch (err) {
      addError(`Failed to reboot instances: ${String(err)}`)
    }
  }, [selectedItems, rebootMutation, addSuccess, addError])

  const handleTerminateConfirm = useCallback(async () => {
    const ids = selectedItems.map((i) => i.instanceId)
    try {
      await terminateMutation.mutateAsync(ids)
      ids.forEach((id) => addSuccess(`Termination initiated for instance ${id}.`))
      setTerminateModalVisible(false)
      setSelectedItems([])
    } catch (err) {
      addError(`Failed to terminate instances: ${String(err)}`)
      setTerminateModalVisible(false)
    }
  }, [selectedItems, terminateMutation, addSuccess, addError])

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'instances'] })
  }, [queryClient])

  const handleRowClick = useCallback(
    (instance: Ec2Instance) => {
      setPanel(
        <InstanceDetailPanel instance={instance} />,
        instance.instanceId,
      )
    },
    [setPanel],
  )

  // ----- action dropdown items -----

  const actionItems = [
    {
      id: 'start',
      text: selectedItems.length > 1 ? 'Start instances' : 'Start instance',
      disabled: !canStart(selectedItems) || isMutating,
    },
    {
      id: 'stop',
      text: selectedItems.length > 1 ? 'Stop instances' : 'Stop instance',
      disabled: !canStop(selectedItems) || isMutating,
    },
    {
      id: 'reboot',
      text: selectedItems.length > 1 ? 'Reboot instances' : 'Reboot instance',
      disabled: !canReboot(selectedItems) || isMutating,
    },
    { id: 'divider', text: '', disabled: true },
    {
      id: 'terminate',
      text: selectedItems.length > 1 ? 'Terminate instances' : 'Terminate instance',
      disabled: !canTerminate(selectedItems) || isMutating,
    },
  ]

  const handleActionDropdown = useCallback(
    async ({ detail }: { detail: { id: string } }) => {
      switch (detail.id) {
        case 'start':
          await handleStart()
          break
        case 'stop':
          await handleStop()
          break
        case 'reboot':
          await handleReboot()
          break
        case 'terminate':
          setTerminateModalVisible(true)
          break
      }
    },
    [handleStart, handleStop, handleReboot],
  )

  // ----- terminate modal props -----
  const isBulkTerminate = selectedItems.length > 1
  const terminateResourceId =
    selectedItems.length === 1 ? selectedItems[0].instanceId : ''

  return (
    <>
      <FlashNotifications items={flashItems} />

      <ResourceTable
        items={instances}
        loading={isLoading}
        columnDefinitions={COLUMN_DEFINITIONS}
        resourceType="instances"
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
              ariaLabel="Refresh instances"
            />
            <ButtonDropdown
              items={actionItems}
              onItemClick={handleActionDropdown}
              disabled={selectedItems.length === 0 || isMutating}
            >
              Instance actions
            </ButtonDropdown>
            <Button variant="primary" href="../launch-wizard">
              Launch instance
            </Button>
          </SpaceBetween>
        }
      />

      <DeleteModal
        visible={terminateModalVisible}
        resourceType="instance"
        resourceId={terminateResourceId}
        onConfirm={handleTerminateConfirm}
        onDismiss={() => setTerminateModalVisible(false)}
        loading={terminateMutation.isPending}
        isBulk={isBulkTerminate}
        bulkCount={selectedItems.length}
      />
    </>
  )
}
