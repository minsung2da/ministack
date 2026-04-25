import type { ServiceDescriptor } from '../_generic/types'
import {
  parseXml,
  selectMembers,
  selectText,
} from '../_generic/components/xmlUtils'
import { copy } from '../../shared/copy'

export type IamUserRow = {
  UserName: string
  UserId: string
  Arn: string
  Path: string
  CreateDate: string
}

/**
 * IAM Users descriptor (D-09 — independent from roles/policies).
 * Transport: aws-query (XML). List + Get + Delete; NO Create (out of scope).
 * D-11: NO update mutation.
 */
export const iamUsersDescriptor: ServiceDescriptor<IamUserRow> = {
  serviceKey: 'iam.users',
  displayName: 'IAM · Users',
  kind: 'list',
  idField: 'UserName',
  list: {
    endpoint: {
      adapter: 'aws-query',
      action: 'ListUsers',
      version: '2010-05-08',
      credentialScope: 'iam',
      defaultParams: { PathPrefix: '/' },
    },
    parseResponse: (raw) =>
      selectMembers(
        parseXml(raw as string),
        'ListUsersResult',
        'Users',
        ['UserName', 'UserId', 'Arn', 'Path', 'CreateDate'],
      ) as IamUserRow[],
    columns: [
      {
        id: 'name',
        header: 'User name',
        sortingField: 'UserName',
        cell: (r) => r.UserName,
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
      title: copy.iam.usersEmptyTitle,
      subtitle: copy.iam.usersEmptySubtitle,
    },
  },
  detail: {
    endpoint: {
      adapter: 'aws-query',
      action: 'GetUser',
      version: '2010-05-08',
      credentialScope: 'iam',
      buildParams: (id: string) => ({ UserName: id }),
    },
    parseResponse: (raw) => {
      const doc = parseXml(raw as string)
      const user = doc.getElementsByTagName('User')[0]
      if (!user) return {}
      return {
        UserName: selectText(user, 'UserName'),
        UserId: selectText(user, 'UserId'),
        Arn: selectText(user, 'Arn'),
        Path: selectText(user, 'Path'),
        CreateDate: selectText(user, 'CreateDate'),
      }
    },
  },
  mutations: {
    delete: {
      endpoint: {
        adapter: 'aws-query',
        action: 'DeleteUser',
        version: '2010-05-08',
        credentialScope: 'iam',
        paramShape: {
          fields: [
            {
              name: 'UserName',
              kind: 'string',
              required: true,
              label: 'User name',
            },
          ],
        },
      },
      typeToConfirmField: 'UserName',
      successFlashbar: copy.iam.deleteUserSuccess,
    },
  },
}
