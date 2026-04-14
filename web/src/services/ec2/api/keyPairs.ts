/**
 * TanStack Query hooks and XML parser for EC2 Key Pairs.
 *
 * Provides:
 *   parseKeyPairs     — XML → Ec2KeyPair[]
 *   useKeyPairs       — query hook (DescribeKeyPairs)
 *   useCreateKeyPair  — mutation hook (CreateKeyPair)
 *   useDeleteKeyPair  — mutation hook (DeleteKeyPair)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ec2KeyPair } from './types'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems } from '../../../shared/api/xml'

/**
 * Parses a DescribeKeyPairs XML response into an array of Ec2KeyPair.
 *
 * Key pairs are inside <keySet><item>.
 */
export function parseKeyPairs(xml: string): Ec2KeyPair[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'keySet')

  return items.map((el) => ({
    keyPairId: getText(el, 'keyPairId'),
    keyName: getText(el, 'keyName'),
    keyType: getText(el, 'keyType'),
    keyFingerprint: getText(el, 'keyFingerprint'),
  }))
}

/**
 * Query hook — fetches all key pairs via DescribeKeyPairs.
 * Stale time 30 s to avoid hammering the local emulator.
 */
export function useKeyPairs() {
  return useQuery({
    queryKey: ['ec2', 'key-pairs'],
    queryFn: () => ec2Query('DescribeKeyPairs').then(parseKeyPairs),
    staleTime: 30_000,
  })
}

type CreateKeyPairInput = {
  keyName: string
  keyType: 'rsa' | 'ed25519'
}

/**
 * Result type for key pair creation — includes optional private key material
 * (only present in the immediate response, never stored).
 */
export type CreateKeyPairResult = {
  keyName: string
  keyPairId: string
  /** Private key material — shown once, never stored (T-02-13). */
  keyMaterial: string | null
}

/**
 * Mutation hook — creates a key pair (RSA or ED25519).
 * Returns CreateKeyPairResult so the caller can display keyMaterial once.
 * Invalidates the key-pairs query on success.
 */
export function useCreateKeyPair() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ keyName, keyType }: CreateKeyPairInput): Promise<CreateKeyPairResult> => {
      const xml = await ec2Query('CreateKeyPair', {
        KeyName: keyName,
        KeyType: keyType,
      })
      const doc = parseXml(xml)
      const root = doc.documentElement
      return {
        keyName: getText(root, 'keyName'),
        keyPairId: getText(root, 'keyPairId'),
        keyMaterial: getText(root, 'keyMaterial') || null,
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'key-pairs'] })
    },
  })
}

/**
 * Mutation hook — deletes a key pair by ID.
 * Invalidates the key-pairs query on success.
 */
export function useDeleteKeyPair() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (keyPairId: string) =>
      ec2Query('DeleteKeyPair', { KeyPairId: keyPairId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ec2', 'key-pairs'] })
    },
  })
}
