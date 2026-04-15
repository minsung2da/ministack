/**
 * TanStack Query hooks and XML parser for EC2 Internet Gateways.
 *
 * Provides:
 *   parseInternetGateways        — XML → Ec2InternetGateway[]
 *   useInternetGateways          — query hook (DescribeInternetGateways)
 *   useCreateInternetGateway     — mutation hook (CreateInternetGateway + optional CreateTags)
 *   useDeleteInternetGateway     — mutation hook (DeleteInternetGateway)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ec2InternetGateway } from './types'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems, getNameTag } from '../../../shared/api/xml'

/**
 * Parses a DescribeInternetGateways XML response into an array of Ec2InternetGateway.
 *
 * Internet gateways are inside <internetGatewaySet><item>.
 * Attachment info is in <attachmentSet><item> within each IGW item.
 */
export function parseInternetGateways(xml: string): Ec2InternetGateway[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'internetGatewaySet')

  return items.map((el) => {
    const attachmentItems = getItems(el, 'attachmentSet')
    const firstAttachment = attachmentItems[0]

    return {
      internetGatewayId: getText(el, 'internetGatewayId'),
      attachedVpcId: firstAttachment ? getText(firstAttachment, 'vpcId') : '',
      attachmentState: firstAttachment ? getText(firstAttachment, 'state') : 'detached',
      nameTag: getNameTag(el),
    }
  })
}

/**
 * Query hook — fetches all Internet Gateways via DescribeInternetGateways.
 * Stale time 30 s to avoid hammering the local emulator.
 */
export function useInternetGateways() {
  return useQuery({
    queryKey: ['ec2', 'internet-gateways'],
    queryFn: () => ec2Query('DescribeInternetGateways').then(parseInternetGateways),
    staleTime: 30_000,
  })
}

type CreateInternetGatewayInput = {
  nameTag?: string
}

/**
 * Mutation hook — creates an Internet Gateway and optionally tags it with a Name.
 * Invalidates the internet-gateways query on success.
 */
export function useCreateInternetGateway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ nameTag }: CreateInternetGatewayInput = {}) => {
      const createXml = await ec2Query('CreateInternetGateway')
      if (nameTag) {
        const doc = parseXml(createXml)
        const igw = doc.getElementsByTagName('internetGateway')[0]
        const igwId = igw ? getText(igw, 'internetGatewayId') : ''
        if (igwId) {
          await ec2Query('CreateTags', {
            'ResourceId.1': igwId,
            'Tag.1.Key': 'Name',
            'Tag.1.Value': nameTag,
          })
        }
      }
      return createXml
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'internet-gateways'] })
    },
  })
}

/**
 * Mutation hook — deletes an Internet Gateway by ID.
 * Invalidates the internet-gateways query on success.
 */
export function useDeleteInternetGateway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (internetGatewayId: string) =>
      ec2Query('DeleteInternetGateway', { InternetGatewayId: internetGatewayId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'internet-gateways'] })
    },
  })
}
