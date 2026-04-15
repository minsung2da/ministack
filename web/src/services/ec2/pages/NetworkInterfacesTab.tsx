/**
 * NetworkInterfacesTab — EC2 Network Interfaces read-only page.
 *
 * Features:
 *   - 6-column table: Name, Network Interface ID, Status, VPC ID, Subnet ID, Primary private IP
 *   - TextFilter (not PropertyFilter) per UI-SPEC for list-only resources
 *   - No create/delete buttons (D-12: list-only)
 *   - Refresh button
 *   - Row click opens SplitPanel with ENI details
 */

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TableProps } from '@cloudscape-design/components/table'
import Button from '@cloudscape-design/components/button'

import type { Ec2NetworkInterface } from '../api/types'
import { useNetworkInterfaces } from '../api/networkInterfaces'
import { ResourceTable } from '../components/ResourceTable'
import { StatusBadge } from '../components/StatusBadge'
import { SplitPanelDetail } from '../components/SplitPanelDetail'
import { useSplitPanel } from '../../../contexts/SplitPanelContext'

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------
const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2NetworkInterface>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || '-',
    sortingField: 'nameTag',
    minWidth: 160,
  },
  {
    id: 'networkInterfaceId',
    header: 'Network Interface ID',
    cell: (item) => item.networkInterfaceId,
    sortingField: 'networkInterfaceId',
    width: 210,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (item) => <StatusBadge state={item.status} />,
    sortingField: 'status',
    width: 120,
  },
  {
    id: 'vpcId',
    header: 'VPC ID',
    cell: (item) => item.vpcId || '-',
    sortingField: 'vpcId',
    minWidth: 180,
  },
  {
    id: 'subnetId',
    header: 'Subnet ID',
    cell: (item) => item.subnetId || '-',
    sortingField: 'subnetId',
    minWidth: 180,
  },
  {
    id: 'privateIpAddress',
    header: 'Primary private IP',
    cell: (item) => item.privateIpAddress || '-',
    sortingField: 'privateIpAddress',
    width: 160,
  },
]

// ---------------------------------------------------------------------------
// SplitPanel detail content
// ---------------------------------------------------------------------------
function NetworkInterfaceDetailPanel({ eni }: { eni: Ec2NetworkInterface }) {
  return (
    <SplitPanelDetail
      header={eni.networkInterfaceId}
      keyValueItems={[
        { label: 'Network Interface ID', value: eni.networkInterfaceId },
        { label: 'Status', value: <StatusBadge state={eni.status} /> },
        { label: 'VPC ID', value: eni.vpcId || '-' },
        { label: 'Subnet ID', value: eni.subnetId || '-' },
        { label: 'Primary private IP', value: eni.privateIpAddress || '-' },
        { label: 'Name', value: eni.nameTag || '-' },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// NetworkInterfacesTab component
// ---------------------------------------------------------------------------
export default function NetworkInterfacesTab() {
  const queryClient = useQueryClient()
  const { data: networkInterfaces = [], isLoading } = useNetworkInterfaces()
  const { setPanel } = useSplitPanel()

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'network-interfaces'] })
  }, [queryClient])

  const handleRowClick = useCallback(
    (eni: Ec2NetworkInterface) => {
      setPanel(
        <NetworkInterfaceDetailPanel eni={eni} />,
        eni.networkInterfaceId,
      )
    },
    [setPanel],
  )

  return (
    <ResourceTable
      items={networkInterfaces}
      loading={isLoading}
      columnDefinitions={COLUMN_DEFINITIONS}
      resourceType="network-interfaces"
      filteringProperties={[]}
      useTextFilter
      selectedItems={[]}
      onSelectionChange={() => undefined}
      selectionType="none"
      onRowClick={handleRowClick}
      headerActions={
        <Button
          iconName="refresh"
          variant="icon"
          onClick={handleRefresh}
          ariaLabel="Refresh Network Interfaces"
        />
      }
    />
  )
}
