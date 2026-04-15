/**
 * ElasticIpsTab — EC2 Elastic IP (address) management page.
 *
 * Features:
 *   - 5-column table: Name, Allocation ID, Public IPv4, Associated instance, Private IPv4
 *   - Allocate: single-click action (no modal — immediate API call)
 *   - Release: type-to-confirm with allocationId
 *   - Row click opens SplitPanel with EIP details
 *   - Flashbar success/error feedback
 */

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TableProps } from '@cloudscape-design/components/table'
import type { PropertyFilterProps } from '@cloudscape-design/components/property-filter'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'

import type { Ec2ElasticIp } from '../api/types'
import { useElasticIps, useAllocateAddress, useReleaseAddress } from '../api/elasticIps'
import { ResourceTable } from '../components/ResourceTable'
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
const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2ElasticIp>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || '-',
    sortingField: 'nameTag',
    minWidth: 160,
  },
  {
    id: 'allocationId',
    header: 'Allocation ID',
    cell: (item) => item.allocationId,
    sortingField: 'allocationId',
    width: 200,
  },
  {
    id: 'publicIp',
    header: 'Public IPv4',
    cell: (item) => item.publicIp || '-',
    sortingField: 'publicIp',
    width: 140,
  },
  {
    id: 'instanceId',
    header: 'Associated instance',
    cell: (item) => item.instanceId || '-',
    sortingField: 'instanceId',
    minWidth: 180,
  },
  {
    id: 'privateIpAddress',
    header: 'Private IPv4',
    cell: (item) => item.privateIpAddress || '-',
    sortingField: 'privateIpAddress',
    width: 140,
  },
]

// ---------------------------------------------------------------------------
// Filtering properties
// ---------------------------------------------------------------------------
const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  {
    key: 'allocationId',
    propertyLabel: 'Allocation ID',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Allocation ID values',
  },
  {
    key: 'publicIp',
    propertyLabel: 'Public IPv4',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Public IPv4 values',
  },
  {
    key: 'instanceId',
    propertyLabel: 'Associated instance',
    operators: ['=', '!=', ':', '!:'],
    groupValuesLabel: 'Instance values',
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
function ElasticIpDetailPanel({ eip }: { eip: Ec2ElasticIp }) {
  return (
    <SplitPanelDetail
      header={eip.allocationId}
      keyValueItems={[
        { label: 'Allocation ID', value: eip.allocationId },
        { label: 'Public IPv4', value: eip.publicIp || '-' },
        { label: 'Associated instance', value: eip.instanceId || '-' },
        { label: 'Private IPv4', value: eip.privateIpAddress || '-' },
        { label: 'Association ID', value: eip.associationId || '-' },
        { label: 'Name', value: eip.nameTag || '-' },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// ElasticIpsTab component
// ---------------------------------------------------------------------------
export default function ElasticIpsTab() {
  const queryClient = useQueryClient()
  const { data: elasticIps = [], isLoading } = useElasticIps()
  const [selectedItems, setSelectedItems] = useState<Ec2ElasticIp[]>([])

  // Release modal state
  const [releaseVisible, setReleaseVisible] = useState(false)
  const [releaseTarget, setReleaseTarget] = useState<Ec2ElasticIp | null>(null)

  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const { setPanel } = useSplitPanel()

  const allocateMutation = useAllocateAddress()
  const releaseMutation = useReleaseAddress()

  // ----- refresh -----
  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'elastic-ips'] })
  }, [queryClient])

  // ----- row click -----
  const handleRowClick = useCallback(
    (eip: Ec2ElasticIp) => {
      setPanel(<ElasticIpDetailPanel eip={eip} />, eip.allocationId)
    },
    [setPanel],
  )

  // ----- allocate (single-click, no modal) -----
  const handleAllocate = useCallback(async () => {
    try {
      await allocateMutation.mutateAsync()
      addSuccess('Elastic IP address allocated.')
    } catch (err) {
      addError(`Failed to allocate Elastic IP: ${String(err)}`)
    }
  }, [allocateMutation, addSuccess, addError])

  // ----- release -----
  const openRelease = () => {
    if (selectedItems.length === 0) return
    setReleaseTarget(selectedItems[0])
    setReleaseVisible(true)
  }

  const handleReleaseConfirm = useCallback(async () => {
    if (!releaseTarget) return
    try {
      await releaseMutation.mutateAsync(releaseTarget.allocationId)
      addSuccess(`Elastic IP ${releaseTarget.allocationId} released.`)
      setReleaseVisible(false)
      setReleaseTarget(null)
      setSelectedItems([])
    } catch (err) {
      addError(`Failed to release Elastic IP: ${String(err)}`)
      setReleaseVisible(false)
    }
  }, [releaseTarget, releaseMutation, addSuccess, addError])

  return (
    <>
      <FlashNotifications items={flashItems} />

      <ResourceTable
        items={elasticIps}
        loading={isLoading}
        columnDefinitions={COLUMN_DEFINITIONS}
        resourceType="elastic-ips"
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
              ariaLabel="Refresh Elastic IPs"
            />
            <Button
              disabled={selectedItems.length === 0 || releaseMutation.isPending}
              onClick={openRelease}
            >
              Release
            </Button>
            <Button
              variant="primary"
              onClick={handleAllocate}
              loading={allocateMutation.isPending}
              disabled={allocateMutation.isPending}
            >
              Allocate Elastic IP address
            </Button>
          </SpaceBetween>
        }
      />

      {/* Release Elastic IP modal */}
      {releaseTarget && (
        <DeleteModal
          visible={releaseVisible}
          resourceType="Elastic IP"
          resourceId={releaseTarget.allocationId}
          onConfirm={handleReleaseConfirm}
          onDismiss={() => {
            setReleaseVisible(false)
            setReleaseTarget(null)
          }}
          loading={releaseMutation.isPending}
        />
      )}
    </>
  )
}
