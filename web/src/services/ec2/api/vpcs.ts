/**
 * TanStack Query hooks and XML parser for EC2 VPCs.
 *
 * Provides:
 *   parseVpcs       — XML → Ec2Vpc[]
 *   useVpcs         — query hook (DescribeVpcs)
 *   useCreateVpc    — mutation hook (CreateVpc + optional CreateTags)
 *   useDeleteVpc    — mutation hook (DeleteVpc)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ec2Vpc } from './types'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems, getNameTag } from '../../../shared/api/xml'

/**
 * Parses a DescribeVpcs XML response into an array of Ec2Vpc.
 *
 * VPCs are inside <vpcSet><item>. Each item contains a nested
 * <cidrBlockAssociationSet><item> for additional CIDR blocks.
 */
export function parseVpcs(xml: string): Ec2Vpc[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'vpcSet')

  return items.map((el) => {
    const cidrAssocItems = getItems(el, 'cidrBlockAssociationSet')
    const cidrBlockAssociations = cidrAssocItems.map((assoc) => {
      const cidrBlockStateEl = assoc.getElementsByTagName('cidrBlockState')[0]
      const assocState = cidrBlockStateEl
        ? cidrBlockStateEl.getElementsByTagName('state')[0]?.textContent ?? ''
        : ''
      return {
        cidrBlock: getText(assoc, 'cidrBlock'),
        state: assocState,
      }
    })

    return {
      vpcId: getText(el, 'vpcId'),
      state: getText(el, 'state'),
      cidrBlock: getText(el, 'cidrBlock'),
      isDefault: getText(el, 'isDefault') === 'true',
      dhcpOptionsId: getText(el, 'dhcpOptionsId'),
      instanceTenancy: getText(el, 'instanceTenancy'),
      nameTag: getNameTag(el),
      cidrBlockAssociations,
    }
  })
}

/**
 * Query hook — fetches all VPCs via DescribeVpcs.
 * Stale time 30 s to avoid hammering the local emulator.
 */
export function useVpcs() {
  return useQuery({
    queryKey: ['ec2', 'vpcs'],
    queryFn: () => ec2Query('DescribeVpcs').then(parseVpcs),
    staleTime: 30_000,
  })
}

type CreateVpcInput = {
  cidrBlock: string
  nameTag?: string
}

/**
 * Mutation hook — creates a VPC and optionally tags it with a Name.
 * Invalidates the vpcs query on success.
 */
export function useCreateVpc() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ cidrBlock, nameTag }: CreateVpcInput) => {
      const createXml = await ec2Query('CreateVpc', { CidrBlock: cidrBlock })
      if (nameTag) {
        const doc = parseXml(createXml)
        const vpcId = getText(doc.documentElement, 'vpcId')
        if (vpcId) {
          await ec2Query('CreateTags', {
            'ResourceId.1': vpcId,
            'Tag.1.Key': 'Name',
            'Tag.1.Value': nameTag,
          })
        }
      }
      return createXml
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'vpcs'] })
    },
  })
}

/**
 * Mutation hook — deletes a VPC by ID.
 * Invalidates the vpcs query on success.
 */
export function useDeleteVpc() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vpcId: string) => ec2Query('DeleteVpc', { VpcId: vpcId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'vpcs'] })
    },
  })
}
