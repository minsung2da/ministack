/**
 * TanStack Query hooks and XML parser for EC2 NAT Gateways.
 *
 * Provides:
 *   parseNatGateways        — XML → Ec2NatGateway[]
 *   useNatGateways          — query hook (DescribeNatGateways)
 *   useCreateNatGateway     — mutation hook (CreateNatGateway)
 *   useDeleteNatGateway     — mutation hook (DeleteNatGateway)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ec2NatGateway } from './types'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems, getNameTag } from '../../../shared/api/xml'

/**
 * Parses a DescribeNatGateways XML response into an array of Ec2NatGateway.
 *
 * NAT Gateways are inside <natGatewaySet><item>.
 * Public IP is in <natGatewayAddressSet><item>.
 */
export function parseNatGateways(xml: string): Ec2NatGateway[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'natGatewaySet')

  return items.map((el) => {
    const addressItems = getItems(el, 'natGatewayAddressSet')
    const firstAddress = addressItems[0]

    return {
      natGatewayId: getText(el, 'natGatewayId'),
      state: getText(el, 'state'),
      subnetId: getText(el, 'subnetId'),
      vpcId: getText(el, 'vpcId'),
      publicIp: firstAddress ? getText(firstAddress, 'publicIp') : '',
      nameTag: getNameTag(el),
    }
  })
}

/**
 * Query hook — fetches all NAT Gateways via DescribeNatGateways.
 * Stale time 30 s to avoid hammering the local emulator.
 */
export function useNatGateways() {
  return useQuery({
    queryKey: ['ec2', 'nat-gateways'],
    queryFn: () => ec2Query('DescribeNatGateways').then(parseNatGateways),
    staleTime: 30_000,
  })
}

type CreateNatGatewayInput = {
  subnetId: string
  allocationId: string
}

/**
 * Mutation hook — creates a NAT Gateway in the specified subnet with the given Elastic IP.
 * Invalidates the nat-gateways query on success.
 */
export function useCreateNatGateway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ subnetId, allocationId }: CreateNatGatewayInput) =>
      ec2Query('CreateNatGateway', {
        SubnetId: subnetId,
        AllocationId: allocationId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'nat-gateways'] })
    },
  })
}

/**
 * Mutation hook — deletes a NAT Gateway by ID.
 * Invalidates the nat-gateways query on success.
 */
export function useDeleteNatGateway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (natGatewayId: string) =>
      ec2Query('DeleteNatGateway', { NatGatewayId: natGatewayId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'nat-gateways'] })
    },
  })
}
