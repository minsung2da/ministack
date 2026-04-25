import type { ServiceDescriptor } from './types'
import { iamUsersDescriptor } from '../iam/users.descriptor'
import { iamRolesDescriptor } from '../iam/roles.descriptor'
import { iamPoliciesDescriptor } from '../iam/policies.descriptor'
import { stsDescriptor } from '../sts/index.descriptor'
import { secretsDescriptor } from '../secretsmanager/index.descriptor'
import { ssmDescriptor } from '../ssm/index.descriptor'
import { kmsDescriptor } from '../kms/index.descriptor'

/**
 * Generic service descriptor registry (Plan 05-06 wire-up).
 *
 * Replaces Plan 01 placeholders with real descriptors. Adding an 8th service
 * is the GEN-03 proof: one import + one key/value entry here + one route in
 * routes.tsx. No framework code changes required.
 *
 * IAM ships as THREE independent keys (D-09): iam.users / iam.roles / iam.policies.
 * STS is `kind: 'singleton'` (Pitfall 7.2.7).
 */
// Descriptor Row generics narrow their own ColumnDefinition<Row>, but
// ServiceDescriptor (default Row = Record<string, unknown>) stores a more
// permissive shape. Cast through `unknown` to widen — this is safe because
// the generic framework treats rows as opaque records at runtime.
export const GENERIC_DESCRIPTORS: Record<string, ServiceDescriptor> = {
  'iam.users': iamUsersDescriptor as unknown as ServiceDescriptor,
  'iam.roles': iamRolesDescriptor as unknown as ServiceDescriptor,
  'iam.policies': iamPoliciesDescriptor as unknown as ServiceDescriptor,
  sts: stsDescriptor,
  secretsmanager: secretsDescriptor as unknown as ServiceDescriptor,
  ssm: ssmDescriptor as unknown as ServiceDescriptor,
  kms: kmsDescriptor as unknown as ServiceDescriptor,
}
