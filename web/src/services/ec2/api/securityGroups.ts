/**
 * TanStack Query hooks and XML parser for EC2 Security Groups.
 *
 * Provides:
 *   parseSecurityGroups       — XML → Ec2SecurityGroup[]
 *   useSecurityGroups         — query hook (DescribeSecurityGroups)
 *   useCreateSecurityGroup    — mutation hook (CreateSecurityGroup)
 *   useDeleteSecurityGroup    — mutation hook (DeleteSecurityGroup)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ec2SecurityGroup } from './types'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems, getNameTag } from '../../../shared/api/xml'

/**
 * Parses an IP permission element into a rule object with a port range string.
 */
function parsePermission(el: Element): {
  protocol: string
  portRange: string
  source: string
  description: string
} {
  const protocol = getText(el, 'ipProtocol')
  const fromPort = getText(el, 'fromPort')
  const toPort = getText(el, 'toPort')

  let portRange = 'All'
  if (fromPort && toPort) {
    portRange = fromPort === toPort ? fromPort : `${fromPort}-${toPort}`
    if (fromPort === '-1') portRange = 'All'
  }

  // Source from ipRanges or groups
  let source = ''
  const ipRangeItems = getItems(el, 'ipRanges')
  if (ipRangeItems.length > 0) {
    source = ipRangeItems.map((r) => getText(r, 'cidrIp')).filter(Boolean).join(', ')
  }
  if (!source) {
    const groupItems = getItems(el, 'groups')
    if (groupItems.length > 0) {
      source = groupItems.map((g) => getText(g, 'groupId')).filter(Boolean).join(', ')
    }
  }

  // Description from first ipRange
  const description = ipRangeItems.length > 0 ? getText(ipRangeItems[0], 'description') : ''

  return { protocol, portRange, source: source || '0.0.0.0/0', description }
}

/**
 * Parses a DescribeSecurityGroups XML response into an array of Ec2SecurityGroup.
 *
 * Security groups are inside <securityGroupInfo><item>.
 * Inbound rules are in <ipPermissions><item>.
 * Outbound rules are in <ipPermissionsEgress><item>.
 */
export function parseSecurityGroups(xml: string): Ec2SecurityGroup[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'securityGroupInfo')

  return items.map((el) => {
    const inboundItems = getItems(el, 'ipPermissions')
    const outboundItems = getItems(el, 'ipPermissionsEgress')

    const inboundRules = inboundItems.map((perm) => {
      const rule = parsePermission(perm)
      return {
        protocol: rule.protocol,
        portRange: rule.portRange,
        source: rule.source,
        description: rule.description,
      }
    })

    const outboundRules = outboundItems.map((perm) => {
      const rule = parsePermission(perm)
      return {
        protocol: rule.protocol,
        portRange: rule.portRange,
        destination: rule.source,
        description: rule.description,
      }
    })

    return {
      groupId: getText(el, 'groupId'),
      groupName: getText(el, 'groupName'),
      vpcId: getText(el, 'vpcId'),
      groupDescription: getText(el, 'groupDescription'),
      nameTag: getNameTag(el),
      inboundRules,
      outboundRules,
    }
  })
}

/**
 * Query hook — fetches all security groups via DescribeSecurityGroups.
 * Stale time 30 s to avoid hammering the local emulator.
 */
export function useSecurityGroups() {
  return useQuery({
    queryKey: ['ec2', 'security-groups'],
    queryFn: () => ec2Query('DescribeSecurityGroups').then(parseSecurityGroups),
    staleTime: 30_000,
  })
}

type CreateSecurityGroupInput = {
  groupName: string
  groupDescription: string
  vpcId: string
}

/**
 * Mutation hook — creates a security group.
 * Invalidates the security-groups query on success.
 */
export function useCreateSecurityGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ groupName, groupDescription, vpcId }: CreateSecurityGroupInput) =>
      ec2Query('CreateSecurityGroup', {
        GroupName: groupName,
        GroupDescription: groupDescription,
        VpcId: vpcId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'security-groups'] })
    },
  })
}

/**
 * Mutation hook — deletes a security group by ID.
 * Invalidates the security-groups query on success.
 */
export function useDeleteSecurityGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupId: string) => ec2Query('DeleteSecurityGroup', { GroupId: groupId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'security-groups'] })
    },
  })
}
