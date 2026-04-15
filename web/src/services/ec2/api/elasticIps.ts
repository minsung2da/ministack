/**
 * TanStack Query hooks and XML parser for EC2 Elastic IPs (Addresses).
 *
 * Provides:
 *   parseElasticIps      — XML → Ec2ElasticIp[]
 *   useElasticIps        — query hook (DescribeAddresses)
 *   useAllocateAddress   — mutation hook (AllocateAddress)
 *   useReleaseAddress    — mutation hook (ReleaseAddress)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ec2ElasticIp } from './types'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems, getNameTag } from '../../../shared/api/xml'

/**
 * Parses a DescribeAddresses XML response into an array of Ec2ElasticIp.
 *
 * Addresses are inside <addressesSet><item>.
 */
export function parseElasticIps(xml: string): Ec2ElasticIp[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'addressesSet')

  return items.map((el) => ({
    allocationId: getText(el, 'allocationId'),
    publicIp: getText(el, 'publicIp'),
    instanceId: getText(el, 'instanceId'),
    privateIpAddress: getText(el, 'privateIpAddress'),
    associationId: getText(el, 'associationId'),
    nameTag: getNameTag(el),
  }))
}

/**
 * Query hook — fetches all Elastic IPs via DescribeAddresses.
 * Stale time 30 s to avoid hammering the local emulator.
 */
export function useElasticIps() {
  return useQuery({
    queryKey: ['ec2', 'elastic-ips'],
    queryFn: () => ec2Query('DescribeAddresses').then(parseElasticIps),
    staleTime: 30_000,
  })
}

/**
 * Mutation hook — allocates a new Elastic IP in VPC domain.
 * Invalidates the elastic-ips query on success.
 */
export function useAllocateAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => ec2Query('AllocateAddress', { Domain: 'vpc' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'elastic-ips'] })
    },
  })
}

/**
 * Mutation hook — releases an Elastic IP by allocation ID.
 * Invalidates the elastic-ips query on success.
 */
export function useReleaseAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (allocationId: string) =>
      ec2Query('ReleaseAddress', { AllocationId: allocationId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'elastic-ips'] })
    },
  })
}
