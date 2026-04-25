/**
 * KMS AWS-JSON fixtures (Phase 5 Wave 0).
 *
 * Sourced verbatim from 05-RESEARCH.md §9.10.
 *
 * Protocol notes:
 * - Backend dispatches by X-Amz-Target header 'TrentService.{Action}'
 *   — historical prefix, NOT 'KMS.' (Pitfall 7.2.8 / kms.py:805).
 */

export const KMS_FIXTURES = {
  listKeys: {
    Keys: [
      {
        KeyId: '44444444-4444-4444-4444-444444444444',
        KeyArn:
          'arn:aws:kms:us-east-1:000000000000:key/44444444-4444-4444-4444-444444444444',
      },
      {
        KeyId: '55555555-5555-5555-5555-555555555555',
        KeyArn:
          'arn:aws:kms:us-east-1:000000000000:key/55555555-5555-5555-5555-555555555555',
      },
    ],
    Truncated: false,
  },
  listKeysEmpty: {
    Keys: [] as { KeyId: string; KeyArn: string }[],
    Truncated: false,
  },
  describeKey: {
    KeyMetadata: {
      KeyId: '44444444-4444-4444-4444-444444444444',
      Arn:
        'arn:aws:kms:us-east-1:000000000000:key/44444444-4444-4444-4444-444444444444',
      CreationDate: 1713350000,
      Enabled: true,
      Description: '',
      KeyUsage: 'ENCRYPT_DECRYPT',
      KeyState: 'Enabled',
      Origin: 'AWS_KMS',
      KeyManager: 'CUSTOMER',
      KeySpec: 'SYMMETRIC_DEFAULT',
      EncryptionAlgorithms: ['SYMMETRIC_DEFAULT'],
      SigningAlgorithms: [] as string[],
    },
  },
} as const
