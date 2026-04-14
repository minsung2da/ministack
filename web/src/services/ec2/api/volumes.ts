/**
 * TanStack Query hooks and XML parser for EC2 EBS Volumes.
 *
 * Provides:
 *   parseVolumes     — XML → Ec2Volume[]
 *   useVolumes       — query hook (DescribeVolumes)
 *   useCreateVolume  — mutation hook (CreateVolume + optional CreateTags)
 *   useDeleteVolume  — mutation hook (DeleteVolume)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ec2Volume } from './types'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems, getNameTag } from '../../../shared/api/xml'

/**
 * Parses a DescribeVolumes XML response into an array of Ec2Volume.
 *
 * Volumes are inside <volumeSet><item>. The attached instance ID is
 * extracted from the first item in <attachmentSet>.
 */
export function parseVolumes(xml: string): Ec2Volume[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'volumeSet')

  return items.map((el) => {
    const attachmentItems = getItems(el, 'attachmentSet')
    const attachedInstanceId =
      attachmentItems.length > 0 ? getText(attachmentItems[0], 'instanceId') : ''

    return {
      volumeId: getText(el, 'volumeId'),
      status: getText(el, 'status'),
      size: parseInt(getText(el, 'size'), 10) || 0,
      volumeType: getText(el, 'volumeType'),
      availabilityZone: getText(el, 'availabilityZone'),
      attachedInstanceId,
      nameTag: getNameTag(el),
      createTime: getText(el, 'createTime'),
    }
  })
}

/**
 * Query hook — fetches all EBS volumes via DescribeVolumes.
 * Stale time 30 s to avoid hammering the local emulator.
 */
export function useVolumes() {
  return useQuery({
    queryKey: ['ec2', 'volumes'],
    queryFn: () => ec2Query('DescribeVolumes').then(parseVolumes),
    staleTime: 30_000,
  })
}

type CreateVolumeInput = {
  availabilityZone: string
  /** Volume size in GiB (client-validated 1-16384, T-02-14). */
  size: number
  volumeType: 'gp2' | 'gp3' | 'io1' | 'io2' | 'standard'
  nameTag?: string
}

/**
 * Mutation hook — creates an EBS volume and optionally tags it with a Name.
 * Invalidates the volumes query on success.
 */
export function useCreateVolume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ availabilityZone, size, volumeType, nameTag }: CreateVolumeInput) => {
      const createXml = await ec2Query('CreateVolume', {
        AvailabilityZone: availabilityZone,
        Size: String(size),
        VolumeType: volumeType,
      })
      if (nameTag) {
        const doc = parseXml(createXml)
        const volumeId = getText(doc.documentElement, 'volumeId')
        if (volumeId) {
          await ec2Query('CreateTags', {
            'ResourceId.1': volumeId,
            'Tag.1.Key': 'Name',
            'Tag.1.Value': nameTag,
          })
        }
      }
      return createXml
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'volumes'] })
    },
  })
}

/**
 * Mutation hook — deletes an EBS volume by ID.
 * Invalidates the volumes query on success.
 */
export function useDeleteVolume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (volumeId: string) =>
      ec2Query('DeleteVolume', { VolumeId: volumeId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'volumes'] })
    },
  })
}
