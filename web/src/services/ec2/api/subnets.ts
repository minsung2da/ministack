/**
 * TanStack Query hooks and XML parser for EC2 Subnets.
 *
 * Provides:
 *   parseSubnets       — XML → Ec2Subnet[]
 *   useSubnets         — query hook (DescribeSubnets)
 *   useCreateSubnet    — mutation hook (CreateSubnet + optional CreateTags)
 *   useDeleteSubnet    — mutation hook (DeleteSubnet)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ec2Subnet } from './types'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems, getNameTag } from '../../../shared/api/xml'

/**
 * Parses a DescribeSubnets XML response into an array of Ec2Subnet.
 *
 * Subnets are inside <subnetSet><item>.
 */
export function parseSubnets(xml: string): Ec2Subnet[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'subnetSet')

  return items.map((el) => ({
    subnetId: getText(el, 'subnetId'),
    state: getText(el, 'state'),
    vpcId: getText(el, 'vpcId'),
    cidrBlock: getText(el, 'cidrBlock'),
    availabilityZone: getText(el, 'availabilityZone'),
    availableIpAddressCount: parseInt(getText(el, 'availableIpAddressCount'), 10) || 0,
    nameTag: getNameTag(el),
    mapPublicIpOnLaunch: getText(el, 'mapPublicIpOnLaunch') === 'true',
  }))
}

/**
 * Query hook — fetches all subnets via DescribeSubnets.
 * Stale time 30 s to avoid hammering the local emulator.
 */
export function useSubnets() {
  return useQuery({
    queryKey: ['ec2', 'subnets'],
    queryFn: () => ec2Query('DescribeSubnets').then(parseSubnets),
    staleTime: 30_000,
  })
}

type CreateSubnetInput = {
  vpcId: string
  cidrBlock: string
  availabilityZone: string
  nameTag?: string
}

/**
 * Mutation hook — creates a subnet and optionally tags it with a Name.
 * Invalidates the subnets query on success.
 */
export function useCreateSubnet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ vpcId, cidrBlock, availabilityZone, nameTag }: CreateSubnetInput) => {
      const createXml = await ec2Query('CreateSubnet', {
        VpcId: vpcId,
        CidrBlock: cidrBlock,
        AvailabilityZone: availabilityZone,
      })
      if (nameTag) {
        const doc = parseXml(createXml)
        const subnetId = getText(doc.documentElement, 'subnetId')
        if (subnetId) {
          await ec2Query('CreateTags', {
            'ResourceId.1': subnetId,
            'Tag.1.Key': 'Name',
            'Tag.1.Value': nameTag,
          })
        }
      }
      return createXml
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'subnets'] })
    },
  })
}

/**
 * Mutation hook — deletes a subnet by ID.
 * Invalidates the subnets query on success.
 */
export function useDeleteSubnet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (subnetId: string) => ec2Query('DeleteSubnet', { SubnetId: subnetId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'subnets'] })
    },
  })
}
