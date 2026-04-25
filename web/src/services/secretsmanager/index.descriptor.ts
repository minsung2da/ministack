import type { ServiceDescriptor } from '../_generic/types'
import { copy } from '../../shared/copy'

export type SecretRow = {
  ARN: string
  Name: string
  Description?: string
  CreatedDate?: number
  LastChangedDate?: number
  RotationEnabled?: boolean
}

/**
 * Secrets Manager descriptor — aws-json.
 * D-08: maskFields = ['SecretString', 'SecretBinary'] — rendered as `••••••••`
 * by default with a per-field Reveal toggle in GenericDetailPanel.
 * D-11: NO update mutation.
 */
export const secretsDescriptor: ServiceDescriptor<SecretRow> = {
  serviceKey: 'secretsmanager',
  displayName: 'Secrets Manager',
  kind: 'list',
  idField: 'Name',
  list: {
    endpoint: {
      adapter: 'aws-json',
      target: 'secretsmanager.ListSecrets',
      credentialScope: 'secretsmanager',
      defaultBody: { MaxResults: 100 },
    },
    parseResponse: (raw) =>
      ((raw as { SecretList?: SecretRow[] }).SecretList ?? []) as SecretRow[],
    columns: [
      {
        id: 'name',
        header: 'Name',
        sortingField: 'Name',
        cell: (r) => r.Name,
      },
      { id: 'desc', header: 'Description', cell: (r) => r.Description ?? '' },
      {
        id: 'rotation',
        header: 'Rotation',
        cell: (r) => (r.RotationEnabled ? 'Enabled' : 'Disabled'),
      },
    ],
    emptyStateCopy: {
      title: copy.secretsmanager.emptyTitle,
      subtitle: copy.secretsmanager.emptySubtitle,
    },
  },
  detail: {
    endpoint: {
      adapter: 'aws-json',
      target: 'secretsmanager.GetSecretValue',
      credentialScope: 'secretsmanager',
      buildBody: (id: string) => ({ SecretId: id }),
    },
    parseResponse: (raw) => raw as Record<string, unknown>,
    // D-08: mask secret values by default; user opts in to Reveal.
    maskFields: ['SecretString', 'SecretBinary'],
  },
  mutations: {
    create: {
      adapter: 'aws-json',
      target: 'secretsmanager.CreateSecret',
      credentialScope: 'secretsmanager',
      bodyShape: {
        fields: [
          {
            name: 'Name',
            kind: 'string',
            required: true,
            label: 'Secret name',
          },
          {
            name: 'Description',
            kind: 'string',
            required: false,
            label: 'Description',
          },
          {
            name: 'SecretString',
            kind: 'json',
            required: false,
            label: 'Secret value (JSON)',
            placeholder: '{"key":"value"}',
          },
        ],
      },
      successFlashbar: copy.secretsmanager.createSuccess,
    },
    delete: {
      endpoint: {
        adapter: 'aws-json',
        target: 'secretsmanager.DeleteSecret',
        credentialScope: 'secretsmanager',
        bodyShape: {
          fields: [
            {
              name: 'SecretId',
              kind: 'string',
              required: true,
              label: 'Secret id',
            },
          ],
        },
      },
      typeToConfirmField: 'Name',
      successFlashbar: copy.secretsmanager.deleteSuccess,
    },
  },
}
