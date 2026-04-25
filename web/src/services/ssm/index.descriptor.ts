import type { ServiceDescriptor } from '../_generic/types'
import { copy } from '../../shared/copy'

export type SsmParam = {
  Name: string
  Type?: string
  Version?: number
  LastModifiedDate?: number
  ARN?: string
  DataType?: string
  Tier?: string
}

/**
 * Systems Manager (SSM) descriptor — aws-json.
 *
 * D-08 rationale: we mask `Value` for ALL parameters by default. Real-world
 * SSM parameters with Type=SecureString are secrets; String-typed parameters
 * are not sensitive but masking them is a safe default the user can always
 * Reveal. Conditional masking by Type would require parseResponse-level logic
 * and is deferred.
 * D-11: NO update mutation.
 */
export const ssmDescriptor: ServiceDescriptor<SsmParam> = {
  serviceKey: 'ssm',
  displayName: 'Systems Manager',
  kind: 'list',
  idField: 'Name',
  list: {
    endpoint: {
      adapter: 'aws-json',
      target: 'AmazonSSM.DescribeParameters',
      credentialScope: 'ssm',
      defaultBody: { MaxResults: 50 },
    },
    parseResponse: (raw) =>
      ((raw as { Parameters?: SsmParam[] }).Parameters ?? []) as SsmParam[],
    columns: [
      {
        id: 'name',
        header: 'Name',
        sortingField: 'Name',
        cell: (r) => r.Name,
      },
      {
        id: 'type',
        header: 'Type',
        sortingField: 'Type',
        cell: (r) => r.Type ?? '',
      },
      {
        id: 'version',
        header: 'Version',
        cell: (r) => (r.Version !== undefined ? String(r.Version) : ''),
      },
    ],
    emptyStateCopy: {
      title: copy.ssm.emptyTitle,
      subtitle: copy.ssm.emptySubtitle,
    },
  },
  detail: {
    endpoint: {
      adapter: 'aws-json',
      target: 'AmazonSSM.GetParameter',
      credentialScope: 'ssm',
      buildBody: (id: string) => ({ Name: id, WithDecryption: false }),
    },
    parseResponse: (raw) =>
      ((raw as { Parameter?: Record<string, unknown> }).Parameter ??
        {}) as Record<string, unknown>,
    // D-08: mask the Value field. Users can Reveal per-field.
    maskFields: ['Value'],
  },
  mutations: {
    delete: {
      endpoint: {
        adapter: 'aws-json',
        target: 'AmazonSSM.DeleteParameter',
        credentialScope: 'ssm',
        bodyShape: {
          fields: [
            {
              name: 'Name',
              kind: 'string',
              required: true,
              label: 'Parameter name',
            },
          ],
        },
      },
      typeToConfirmField: 'Name',
      successFlashbar: copy.ssm.deleteSuccess,
    },
  },
}
