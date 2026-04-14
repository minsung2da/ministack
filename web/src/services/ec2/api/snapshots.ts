/**
 * TanStack Query hooks and XML parser for EC2 EBS Snapshots.
 *
 * Provides:
 *   parseSnapshots      — XML → Ec2Snapshot[]
 *   useSnapshots        — query hook (DescribeSnapshots)
 *   useCreateSnapshot   — mutation hook (CreateSnapshot)
 *   useDeleteSnapshot   — mutation hook (DeleteSnapshot)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ec2Snapshot } from './types'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems, getNameTag } from '../../../shared/api/xml'

/**
 * Parses a DescribeSnapshots XML response into an array of Ec2Snapshot.
 *
 * Snapshots are inside <snapshotSet><item>.
 */
export function parseSnapshots(xml: string): Ec2Snapshot[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'snapshotSet')

  return items.map((el) => ({
    snapshotId: getText(el, 'snapshotId'),
    status: getText(el, 'status'),
    volumeId: getText(el, 'volumeId'),
    volumeSize: parseInt(getText(el, 'volumeSize'), 10) || 0,
    startTime: getText(el, 'startTime'),
    description: getText(el, 'description'),
    nameTag: getNameTag(el),
  }))
}

/**
 * Query hook — fetches all snapshots owned by the account via DescribeSnapshots.
 * Uses Owner=self to limit scope to local emulator resources.
 * Stale time 30 s to avoid hammering the local emulator.
 */
export function useSnapshots() {
  return useQuery({
    queryKey: ['ec2', 'snapshots'],
    queryFn: () =>
      ec2Query('DescribeSnapshots', { 'Owner.1': 'self' }).then(parseSnapshots),
    staleTime: 30_000,
  })
}

type CreateSnapshotInput = {
  volumeId: string
  description?: string
}

/**
 * Mutation hook — creates a snapshot from an EBS volume.
 * Invalidates the snapshots query on success.
 */
export function useCreateSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ volumeId, description }: CreateSnapshotInput) =>
      ec2Query('CreateSnapshot', {
        VolumeId: volumeId,
        ...(description ? { Description: description } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'snapshots'] })
    },
  })
}

/**
 * Mutation hook — deletes a snapshot by ID.
 * Invalidates the snapshots query on success.
 */
export function useDeleteSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (snapshotId: string) =>
      ec2Query('DeleteSnapshot', { SnapshotId: snapshotId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'snapshots'] })
    },
  })
}
