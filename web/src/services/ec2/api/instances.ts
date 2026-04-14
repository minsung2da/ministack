/**
 * TanStack Query hooks and XML parser for EC2 Instances.
 *
 * Provides:
 *   parseInstances  — XML → Ec2Instance[]
 *   useInstances    — query hook (DescribeInstances)
 *   useStartInstances, useStopInstances,
 *   useTerminateInstances, useRebootInstances — mutation hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ec2Instance } from './types'
import { ec2Query, addMemberList } from './ec2Client'
import { parseXml, getText, getNameTag } from '../../../shared/api/xml'

/**
 * Parses a DescribeInstances XML response into a flat array of Ec2Instance.
 *
 * EC2 XML nests instances inside reservations:
 *   <reservationSet><item> … <instancesSet><item> … </item></instancesSet> </item></reservationSet>
 *
 * We MUST scope the inner `<item>` query to each reservation's `<instancesSet>`
 * to avoid picking up items from sibling sets (e.g. securityGroups / blockDeviceMappings).
 */
export function parseInstances(xml: string): Ec2Instance[] {
  const doc = parseXml(xml)
  const reservationSet = doc.getElementsByTagName('reservationSet')[0]
  if (!reservationSet) return []

  const reservations = Array.from(reservationSet.children).filter(
    (el) => el.tagName === 'item',
  )

  const instances: Ec2Instance[] = []

  for (const reservation of reservations) {
    const instancesSet = reservation.getElementsByTagName('instancesSet')[0]
    if (!instancesSet) continue

    const instanceItems = Array.from(instancesSet.children).filter(
      (el) => el.tagName === 'item',
    )

    for (const el of instanceItems) {
      // state: navigate to instanceState child, then name
      const instanceStateEl = el.getElementsByTagName('instanceState')[0]
      const state = instanceStateEl
        ? instanceStateEl.getElementsByTagName('name')[0]?.textContent ?? ''
        : ''

      // securityGroups: from the instance element's groupSet
      const groupSet = el.getElementsByTagName('groupSet')[0]
      const securityGroups: Array<{ groupId: string; groupName: string }> = []
      if (groupSet) {
        const groupItems = Array.from(groupSet.children).filter(
          (g) => g.tagName === 'item',
        )
        for (const g of groupItems) {
          securityGroups.push({
            groupId: g.getElementsByTagName('groupId')[0]?.textContent ?? '',
            groupName: g.getElementsByTagName('groupName')[0]?.textContent ?? '',
          })
        }
      }

      // blockDeviceMappings: from blockDeviceMapping set
      const bdmSet = el.getElementsByTagName('blockDeviceMapping')[0]
      const blockDeviceMappings: Array<{ deviceName: string; volumeId: string }> = []
      if (bdmSet) {
        const bdmItems = Array.from(bdmSet.children).filter(
          (b) => b.tagName === 'item',
        )
        for (const b of bdmItems) {
          const ebsEl = b.getElementsByTagName('ebs')[0]
          blockDeviceMappings.push({
            deviceName: b.getElementsByTagName('deviceName')[0]?.textContent ?? '',
            volumeId: ebsEl
              ? ebsEl.getElementsByTagName('volumeId')[0]?.textContent ?? ''
              : '',
          })
        }
      }

      // iamInstanceProfile: arn field inside iamInstanceProfile element
      const iamEl = el.getElementsByTagName('iamInstanceProfile')[0]
      const iamInstanceProfile = iamEl
        ? iamEl.getElementsByTagName('arn')[0]?.textContent ?? ''
        : ''

      // monitoring state
      const monitoringEl = el.getElementsByTagName('monitoring')[0]
      const monitoring = monitoringEl
        ? monitoringEl.getElementsByTagName('state')[0]?.textContent ?? ''
        : ''

      // placement > availabilityZone
      const placementEl = el.getElementsByTagName('placement')[0]
      const availabilityZone = placementEl
        ? placementEl.getElementsByTagName('availabilityZone')[0]?.textContent ?? ''
        : ''

      instances.push({
        instanceId: getText(el, 'instanceId'),
        instanceType: getText(el, 'instanceType'),
        state,
        availabilityZone,
        publicIpAddress: getText(el, 'ipAddress'),
        privateIpAddress: getText(el, 'privateIpAddress'),
        vpcId: getText(el, 'vpcId'),
        subnetId: getText(el, 'subnetId'),
        nameTag: getNameTag(el),
        launchTime: getText(el, 'launchTime'),
        keyName: getText(el, 'keyName'),
        imageId: getText(el, 'imageId'),
        architecture: getText(el, 'architecture'),
        platform: getText(el, 'platform'),
        securityGroups,
        monitoring,
        privateDnsName: getText(el, 'privateDnsName'),
        publicDnsName: getText(el, 'dnsName'),
        rootDeviceName: getText(el, 'rootDeviceName'),
        rootDeviceType: getText(el, 'rootDeviceType'),
        blockDeviceMappings,
        iamInstanceProfile,
      })
    }
  }

  return instances
}

// ---------------------------------------------------------------------------
// Query hook
// ---------------------------------------------------------------------------

/**
 * Fetches and caches the EC2 instance list.
 * Stale after 30 seconds; background-refetches on window focus.
 */
export function useInstances() {
  return useQuery({
    queryKey: ['ec2', 'instances'],
    queryFn: async () => {
      const xml = await ec2Query('DescribeInstances')
      return parseInstances(xml)
    },
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Starts one or more instances by ID.
 * Invalidates the instances query on success so the table refreshes.
 */
export function useStartInstances() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (instanceIds: string[]) => {
      const params: Record<string, string> = {}
      addMemberList(params, 'InstanceId', instanceIds)
      return ec2Query('StartInstances', params)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'instances'] })
    },
  })
}

/**
 * Stops one or more instances by ID.
 */
export function useStopInstances() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (instanceIds: string[]) => {
      const params: Record<string, string> = {}
      addMemberList(params, 'InstanceId', instanceIds)
      return ec2Query('StopInstances', params)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'instances'] })
    },
  })
}

/**
 * Terminates one or more instances by ID.
 */
export function useTerminateInstances() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (instanceIds: string[]) => {
      const params: Record<string, string> = {}
      addMemberList(params, 'InstanceId', instanceIds)
      return ec2Query('TerminateInstances', params)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'instances'] })
    },
  })
}

/**
 * Reboots one or more instances by ID.
 */
export function useRebootInstances() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (instanceIds: string[]) => {
      const params: Record<string, string> = {}
      addMemberList(params, 'InstanceId', instanceIds)
      return ec2Query('RebootInstances', params)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'instances'] })
    },
  })
}
