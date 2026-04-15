/**
 * RouteTablesTab — EC2 Route Tables read-only page.
 *
 * Features:
 *   - 5-column table: Name, Route Table ID, VPC ID, Main (Yes/No), Routes (count)
 *   - TextFilter (not PropertyFilter) per UI-SPEC for list-only resources
 *   - No create/delete buttons (D-12: list-only)
 *   - Refresh button
 *   - Row click opens SplitPanel with route table details
 */

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TableProps } from '@cloudscape-design/components/table'
import Button from '@cloudscape-design/components/button'
import Badge from '@cloudscape-design/components/badge'

import type { Ec2RouteTable } from '../api/types'
import { useRouteTables } from '../api/routeTables'
import { ResourceTable } from '../components/ResourceTable'
import { SplitPanelDetail } from '../components/SplitPanelDetail'
import { useSplitPanel } from '../../../contexts/SplitPanelContext'

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------
const COLUMN_DEFINITIONS: TableProps.ColumnDefinition<Ec2RouteTable>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => item.nameTag || '-',
    sortingField: 'nameTag',
    minWidth: 160,
  },
  {
    id: 'routeTableId',
    header: 'Route Table ID',
    cell: (item) => item.routeTableId,
    sortingField: 'routeTableId',
    width: 200,
  },
  {
    id: 'vpcId',
    header: 'VPC ID',
    cell: (item) => item.vpcId || '-',
    sortingField: 'vpcId',
    minWidth: 180,
  },
  {
    id: 'isMain',
    header: 'Main',
    cell: (item) =>
      item.isMain ? (
        <Badge color="blue">Yes</Badge>
      ) : (
        <span>No</span>
      ),
    sortingField: 'isMain',
    width: 90,
  },
  {
    id: 'routeCount',
    header: 'Routes',
    cell: (item) => item.routeCount,
    sortingField: 'routeCount',
    width: 90,
  },
]

// ---------------------------------------------------------------------------
// SplitPanel detail content
// ---------------------------------------------------------------------------
function RouteTableDetailPanel({ rt }: { rt: Ec2RouteTable }) {
  return (
    <SplitPanelDetail
      header={rt.routeTableId}
      keyValueItems={[
        { label: 'Route Table ID', value: rt.routeTableId },
        { label: 'VPC ID', value: rt.vpcId || '-' },
        { label: 'Main', value: rt.isMain ? 'Yes' : 'No' },
        { label: 'Routes', value: rt.routeCount },
        { label: 'Name', value: rt.nameTag || '-' },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// RouteTablesTab component
// ---------------------------------------------------------------------------
export default function RouteTablesTab() {
  const queryClient = useQueryClient()
  const { data: routeTables = [], isLoading } = useRouteTables()
  const { setPanel } = useSplitPanel()

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['ec2', 'route-tables'] })
  }, [queryClient])

  const handleRowClick = useCallback(
    (rt: Ec2RouteTable) => {
      setPanel(<RouteTableDetailPanel rt={rt} />, rt.routeTableId)
    },
    [setPanel],
  )

  return (
    <ResourceTable
      items={routeTables}
      loading={isLoading}
      columnDefinitions={COLUMN_DEFINITIONS}
      resourceType="route-tables"
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
          ariaLabel="Refresh Route Tables"
        />
      }
    />
  )
}
