import type { ServiceDescriptor } from '../_generic/types'
import { copy } from '../../shared/copy'

export type KmsKey = {
  KeyId: string
  KeyArn: string
}

/**
 * KMS descriptor — aws-json. READ-ONLY.
 * Absence of `mutations` field → generic framework suppresses Create and
 * Delete controls (D-02). KMS key metadata is public per the emulator's
 * trust model; no maskFields needed.
 * Note `TrentService.` prefix (historical KMS target name).
 */
export const kmsDescriptor: ServiceDescriptor<KmsKey> = {
  serviceKey: 'kms',
  displayName: 'KMS',
  kind: 'list',
  idField: 'KeyId',
  list: {
    endpoint: {
      adapter: 'aws-json',
      target: 'TrentService.ListKeys',
      credentialScope: 'kms',
      defaultBody: { Limit: 1000 },
    },
    parseResponse: (raw) =>
      ((raw as { Keys?: KmsKey[] }).Keys ?? []) as KmsKey[],
    columns: [
      {
        id: 'id',
        header: 'Key ID',
        sortingField: 'KeyId',
        cell: (r) => r.KeyId,
      },
      { id: 'arn', header: 'ARN', cell: (r) => r.KeyArn },
    ],
    emptyStateCopy: {
      title: copy.kms.emptyTitle,
      subtitle: copy.kms.emptySubtitle,
    },
  },
  detail: {
    endpoint: {
      adapter: 'aws-json',
      target: 'TrentService.DescribeKey',
      credentialScope: 'kms',
      buildBody: (id: string) => ({ KeyId: id }),
    },
    parseResponse: (raw) =>
      ((raw as { KeyMetadata?: Record<string, unknown> }).KeyMetadata ??
        {}) as Record<string, unknown>,
    // No maskFields — KMS key metadata is not secret.
  },
  // NO mutations — D-02 absence renders read-only UI.
}
