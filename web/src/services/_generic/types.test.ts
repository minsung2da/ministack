import { describe, it, expectTypeOf } from 'vitest'
import type {
  Adapter,
  ColumnDefinition,
  ListEndpoint,
  MutationSpec,
  ServiceDescriptor,
} from './types'

describe('_generic/types', () => {
  it('Adapter union has exactly three members', () => {
    expectTypeOf<Adapter>().toEqualTypeOf<'rest' | 'aws-json' | 'aws-query'>()
  })

  it('aws-json ListEndpoint compiles with target + credentialScope', () => {
    const ep: ListEndpoint = {
      adapter: 'aws-json',
      target: 'DynamoDB_20120810.ListTables',
      credentialScope: 'dynamodb',
      defaultBody: {},
    }
    expectTypeOf(ep).toMatchTypeOf<ListEndpoint>()
  })

  it('aws-query ListEndpoint compiles with action + version', () => {
    const ep: ListEndpoint = {
      adapter: 'aws-query',
      action: 'ListUsers',
      version: '2010-05-08',
      credentialScope: 'iam',
    }
    expectTypeOf(ep).toMatchTypeOf<ListEndpoint>()
  })

  it('aws-json MutationSpec requires bodyShape', () => {
    const spec: MutationSpec = {
      adapter: 'aws-json',
      target: 'Secrets.CreateSecret',
      credentialScope: 'secretsmanager',
      bodyShape: { fields: [] },
    }
    expectTypeOf(spec).toMatchTypeOf<MutationSpec>()
  })

  it('minimal list descriptor type-checks', () => {
    const descriptor: ServiceDescriptor = {
      serviceKey: 'iam.users',
      displayName: 'IAM Users',
      idField: 'UserName',
      list: {
        endpoint: {
          adapter: 'aws-query',
          action: 'ListUsers',
          version: '2010-05-08',
          credentialScope: 'iam',
        },
        parseResponse: () => [],
        columns: [],
      },
    }
    expectTypeOf(descriptor).toMatchTypeOf<ServiceDescriptor>()
  })

  it("singleton descriptor compiles with kind: 'singleton'", () => {
    const descriptor: ServiceDescriptor = {
      serviceKey: 'sts',
      displayName: 'STS',
      kind: 'singleton',
      idField: 'Arn',
      list: {
        endpoint: {
          adapter: 'aws-query',
          action: 'GetCallerIdentity',
          version: '2011-06-15',
          credentialScope: 'sts',
        },
        parseResponse: () => [],
        columns: [],
      },
    }
    expectTypeOf(descriptor).toMatchTypeOf<ServiceDescriptor>()
  })

  it('ColumnDefinition.cell is typed over the Row generic', () => {
    const col: ColumnDefinition<{ id: string }> = {
      id: 'id',
      header: 'ID',
      cell: (row) => row.id,
    }
    expectTypeOf(col.cell).parameter(0).toEqualTypeOf<{ id: string }>()
  })
})
