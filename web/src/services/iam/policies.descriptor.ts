import type { ServiceDescriptor } from '../_generic/types'
import {
  parseXml,
  selectMembers,
  selectText,
} from '../_generic/components/xmlUtils'
import { copy } from '../../shared/copy'

export type IamPolicyRow = {
  PolicyName: string
  PolicyId: string
  Arn: string
  Path: string
  AttachmentCount: string
  CreateDate: string
}

/**
 * IAM Policies descriptor (D-09 — independent).
 * Detail and delete use the Arn (not the name) — see buildParams.
 * idField is PolicyName (display); the detail buildParams uses Arn from row.
 * For a simple first version we use PolicyName as the id surface and rely on
 * the GetPolicy call to accept a lookup by name via ListPolicies refresh.
 */
export const iamPoliciesDescriptor: ServiceDescriptor<IamPolicyRow> = {
  serviceKey: 'iam.policies',
  displayName: 'IAM · Policies',
  kind: 'list',
  idField: 'PolicyName',
  list: {
    endpoint: {
      adapter: 'aws-query',
      action: 'ListPolicies',
      version: '2010-05-08',
      credentialScope: 'iam',
      defaultParams: { Scope: 'Local' },
    },
    parseResponse: (raw) =>
      selectMembers(
        parseXml(raw as string),
        'ListPoliciesResult',
        'Policies',
        [
          'PolicyName',
          'PolicyId',
          'Arn',
          'Path',
          'AttachmentCount',
          'CreateDate',
        ],
      ) as IamPolicyRow[],
    columns: [
      {
        id: 'name',
        header: 'Policy name',
        sortingField: 'PolicyName',
        cell: (r) => r.PolicyName,
      },
      {
        id: 'attach',
        header: 'Attachments',
        sortingField: 'AttachmentCount',
        cell: (r) => r.AttachmentCount,
      },
      {
        id: 'created',
        header: 'Created',
        sortingField: 'CreateDate',
        cell: (r) => r.CreateDate,
      },
    ],
    emptyStateCopy: {
      title: copy.iam.policiesEmptyTitle,
      subtitle: copy.iam.policiesEmptySubtitle,
    },
  },
  detail: {
    endpoint: {
      adapter: 'aws-query',
      action: 'GetPolicy',
      version: '2010-05-08',
      credentialScope: 'iam',
      // The id segment is PolicyArn in practice; callers that pass only
      // PolicyName will fail against a real backend. Plan 05 accepts this
      // as a known limitation for the first generic-framework pass.
      buildParams: (id: string) => ({ PolicyArn: id }),
    },
    parseResponse: (raw) => {
      const doc = parseXml(raw as string)
      const policy = doc.getElementsByTagName('Policy')[0]
      if (!policy) return {}
      return {
        PolicyName: selectText(policy, 'PolicyName'),
        PolicyId: selectText(policy, 'PolicyId'),
        Arn: selectText(policy, 'Arn'),
        Path: selectText(policy, 'Path'),
        DefaultVersionId: selectText(policy, 'DefaultVersionId'),
        AttachmentCount: selectText(policy, 'AttachmentCount'),
        CreateDate: selectText(policy, 'CreateDate'),
      }
    },
  },
  mutations: {
    delete: {
      endpoint: {
        adapter: 'aws-query',
        action: 'DeletePolicy',
        version: '2010-05-08',
        credentialScope: 'iam',
        paramShape: {
          fields: [
            {
              name: 'PolicyArn',
              kind: 'string',
              required: true,
              label: 'Policy ARN',
            },
          ],
        },
      },
      typeToConfirmField: 'PolicyName',
      successFlashbar: copy.iam.deletePolicySuccess,
    },
  },
}
