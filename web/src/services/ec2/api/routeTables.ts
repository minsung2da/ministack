/**
 * TanStack Query hook and XML parser for EC2 Route Tables.
 *
 * Provides:
 *   parseRouteTables — XML → Ec2RouteTable[]
 *   useRouteTables   — query hook (DescribeRouteTables)
 *
 * Route tables are list-only (no create/delete mutations) per D-12.
 */

import { useQuery } from '@tanstack/react-query'
import type { Ec2RouteTable } from './types'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems, getNameTag } from '../../../shared/api/xml'

/**
 * Parses a DescribeRouteTables XML response into an array of Ec2RouteTable.
 *
 * Route tables are inside <routeTableSet><item>.
 * isMain: true if any <associationSet><item> contains <main>true</main>.
 * routeCount: number of <item> elements in <routeSet>.
 */
export function parseRouteTables(xml: string): Ec2RouteTable[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'routeTableSet')

  return items.map((el) => {
    const associationItems = getItems(el, 'associationSet')
    const isMain = associationItems.some(
      (assoc) => getText(assoc, 'main') === 'true',
    )

    const routeItems = getItems(el, 'routeSet')
    const routeCount = routeItems.length

    return {
      routeTableId: getText(el, 'routeTableId'),
      vpcId: getText(el, 'vpcId'),
      isMain,
      routeCount,
      nameTag: getNameTag(el),
    }
  })
}

/**
 * Query hook — fetches all route tables via DescribeRouteTables.
 * Stale time 30 s to avoid hammering the local emulator.
 */
export function useRouteTables() {
  return useQuery({
    queryKey: ['ec2', 'route-tables'],
    queryFn: () => ec2Query('DescribeRouteTables').then(parseRouteTables),
    staleTime: 30_000,
  })
}
