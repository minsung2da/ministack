/**
 * SSM AWS-JSON fixtures (Phase 5 Wave 0).
 *
 * Sourced verbatim from 05-RESEARCH.md §9.12.
 *
 * Protocol notes:
 * - Backend dispatches by X-Amz-Target header 'AmazonSSM.{Action}' (ssm.py:72).
 * - SecureString values are ENCRYPTED:-prefixed when WithDecryption=false
 *   (Pitfall 7.2.11).
 */

export const SSM_FIXTURES = {
  describeParameters: {
    Parameters: [
      {
        Name: '/app/db/password',
        Type: 'SecureString' as const,
        Version: 1,
        LastModifiedDate: 1713350000,
        LastModifiedUser: 'arn:aws:iam::000000000000:root',
        ARN: 'arn:aws:ssm:us-east-1:000000000000:parameter/app/db/password',
        DataType: 'text',
        Description: '',
        Tier: 'Standard' as const,
      },
    ],
  },
  describeParametersEmpty: {
    Parameters: [] as unknown[],
  },
  // Pitfall 7.2.11 — masked form (WithDecryption=false)
  getParameterMasked: {
    Parameter: {
      Name: '/app/db/password',
      Type: 'SecureString' as const,
      Value: 'ENCRYPTED:YWJjZGVmMTIz',
      Version: 1,
      LastModifiedDate: 1713350000,
      ARN: 'arn:aws:ssm:us-east-1:000000000000:parameter/app/db/password',
      DataType: 'text',
    },
  },
  // WithDecryption=true — plaintext
  getParameterDecrypted: {
    Parameter: {
      Name: '/app/db/password',
      Type: 'SecureString' as const,
      Value: 'actual-secret-value',
      Version: 1,
      LastModifiedDate: 1713350000,
      ARN: 'arn:aws:ssm:us-east-1:000000000000:parameter/app/db/password',
      DataType: 'text',
    },
  },
} as const
