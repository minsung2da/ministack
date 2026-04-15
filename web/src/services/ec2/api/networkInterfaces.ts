/**
 * TanStack Query hook and XML parser for EC2 Network Interfaces.
 *
 * Provides:
 *   parseNetworkInterfaces — XML → Ec2NetworkInterface[]
 *   useNetworkInterfaces   — query hook (DescribeNetworkInterfaces)
 *
 * Network interfaces are list-only (no create/delete mutations) per D-12.
 */

import { useQuery } from '@tanstack/react-query'
import type { Ec2NetworkInterface } from './types'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems, getNameTag } from '../../../shared/api/xml'

/**
 * Parses a DescribeNetworkInterfaces XML response into an array of
 * Ec2NetworkInterface.
 *
 * ENIs are inside <networkInterfaceSet><item>.
 * privateIpAddress maps to the top-level <privateIpAddress> element (the
 * primary private IP assigned to the ENI).
 */
export function parseNetworkInterfaces(xml: string): Ec2NetworkInterface[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'networkInterfaceSet')

  return items.map((el) => ({
    networkInterfaceId: getText(el, 'networkInterfaceId'),
    status: getText(el, 'status'),
    vpcId: getText(el, 'vpcId'),
    subnetId: getText(el, 'subnetId'),
    privateIpAddress: getText(el, 'privateIpAddress'),
    nameTag: getNameTag(el),
  }))
}

/**
 * Query hook — fetches all network interfaces via DescribeNetworkInterfaces.
 * Stale time 30 s to avoid hammering the local emulator.
 */
export function useNetworkInterfaces() {
  return useQuery({
    queryKey: ['ec2', 'network-interfaces'],
    queryFn: () =>
      ec2Query('DescribeNetworkInterfaces').then(parseNetworkInterfaces),
    staleTime: 30_000,
  })
}
