import type { ServiceDescriptor } from '../_generic/types'
import {
  parseXml,
  selectMembers,
  selectText,
} from '../_generic/components/xmlUtils'
import { copy } from '../../shared/copy'

export type IamRoleRow = {
  RoleName: string
  RoleId: string
  Arn: string
  Path: string
  CreateDate: string
}

/**
 * IAM Roles descriptor (D-09 — independent from users/policies).
 */
export const iamRolesDescriptor: ServiceDescriptor<IamRoleRow> = {
  serviceKey: 'iam.roles',
  displayName: 'IAM · Roles',
  kind: 'list',
  idField: 'RoleName',
  list: {
    endpoint: {
      adapter: 'aws-query',
      action: 'ListRoles',
      version: '2010-05-08',
      credentialScope: 'iam',
      defaultParams: { PathPrefix: '/' },
    },
    parseResponse: (raw) =>
      selectMembers(
        parseXml(raw as string),
        'ListRolesResult',
        'Roles',
        ['RoleName', 'RoleId', 'Arn', 'Path', 'CreateDate'],
      ) as IamRoleRow[],
    columns: [
      {
        id: 'name',
        header: 'Role name',
        sortingField: 'RoleName',
        cell: (r) => r.RoleName,
      },
      { id: 'arn', header: 'ARN', cell: (r) => r.Arn },
      { id: 'path', header: 'Path', cell: (r) => r.Path },
      {
        id: 'created',
        header: 'Created',
        sortingField: 'CreateDate',
        cell: (r) => r.CreateDate,
      },
    ],
    emptyStateCopy: {
      title: copy.iam.rolesEmptyTitle,
      subtitle: copy.iam.rolesEmptySubtitle,
    },
  },
  detail: {
    endpoint: {
      adapter: 'aws-query',
      action: 'GetRole',
      version: '2010-05-08',
      credentialScope: 'iam',
      buildParams: (id: string) => ({ RoleName: id }),
    },
    parseResponse: (raw) => {
      const doc = parseXml(raw as string)
      const role = doc.getElementsByTagName('Role')[0]
      if (!role) return {}
      return {
        RoleName: selectText(role, 'RoleName'),
        RoleId: selectText(role, 'RoleId'),
        Arn: selectText(role, 'Arn'),
        Path: selectText(role, 'Path'),
        CreateDate: selectText(role, 'CreateDate'),
        AssumeRolePolicyDocument: selectText(
          role,
          'AssumeRolePolicyDocument',
        ),
      }
    },
  },
  mutations: {
    delete: {
      endpoint: {
        adapter: 'aws-query',
        action: 'DeleteRole',
        version: '2010-05-08',
        credentialScope: 'iam',
        paramShape: {
          fields: [
            {
              name: 'RoleName',
              kind: 'string',
              required: true,
              label: 'Role name',
            },
          ],
        },
      },
      typeToConfirmField: 'RoleName',
      successFlashbar: copy.iam.deleteRoleSuccess,
    },
  },
}
