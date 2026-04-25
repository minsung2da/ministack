/**
 * Secrets Manager AWS-JSON fixtures (Phase 5 Wave 0).
 *
 * Sourced verbatim from 05-RESEARCH.md §9.11.
 *
 * Protocol notes:
 * - Backend dispatches by X-Amz-Target header 'secretsmanager.{Action}'
 *   — LOWERCASE prefix (secretsmanager.py:128).
 * - Phase 5 lists DescribeSecret (metadata only) by default — NOT GetSecretValue
 *   (Pitfall 7.2.10).
 */

const describedSecret = {
  ARN:
    'arn:aws:secretsmanager:us-east-1:000000000000:secret:db-creds-a1b2c3',
  Name: 'db-creds',
  Description: '',
  CreatedDate: 1713350000,
  LastChangedDate: 1713350000,
  LastAccessedDate: null as number | null,
  Tags: [] as { Key: string; Value: string }[],
  SecretVersionsToStages: { v1: ['AWSCURRENT'] },
  RotationEnabled: false,
}

export const SECRETS_FIXTURES = {
  listSecrets: {
    SecretList: [describedSecret],
  },
  listSecretsEmpty: { SecretList: [] as (typeof describedSecret)[] },
  describeSecret: {
    ...describedSecret,
    VersionIdsToStages: { v1: ['AWSCURRENT'] },
  },
} as const
