/**
 * DynamoDB AWS-JSON fixtures (Phase 5 Wave 0).
 *
 * Sourced verbatim from 05-RESEARCH.md §9.1–§9.4 where applicable.
 *
 * Protocol notes:
 * - Backend dispatches by X-Amz-Target header 'DynamoDB_20120810.{Action}'.
 * - All `N` AttributeValues are STRING-encoded on the wire (Pitfall 7.2.1).
 * - `NULL` is `{NULL: true}` (Pitfall 7.2.1).
 * - Complex types (L, M, SS, NS, BS) are OUT OF SCOPE for Phase 5 per D-06.
 * - `LastEvaluatedKey` is a map (not a stringified blob) — Pitfall 7.2.2.
 */

const orderTableBase = {
  TableName: 'orders',
  KeySchema: [
    { AttributeName: 'pk', KeyType: 'HASH' as const },
    { AttributeName: 'sk', KeyType: 'RANGE' as const },
  ],
  AttributeDefinitions: [
    { AttributeName: 'pk', AttributeType: 'S' as const },
    { AttributeName: 'sk', AttributeType: 'S' as const },
  ],
  TableStatus: 'ACTIVE' as const,
  CreationDateTime: 1713350000,
  ItemCount: 3,
  TableSizeBytes: 512,
  TableArn: 'arn:aws:dynamodb:us-east-1:000000000000:table/orders',
  TableId: '11111111-1111-1111-1111-111111111111',
  ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  BillingModeSummary: { BillingMode: 'PAY_PER_REQUEST' as const },
}

const hashOnlyTableBase = {
  ...orderTableBase,
  TableName: 'users',
  KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' as const }],
  AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' as const }],
  TableArn: 'arn:aws:dynamodb:us-east-1:000000000000:table/users',
  TableId: '22222222-2222-2222-2222-222222222222',
}

const scanItems = [
  { pk: { S: 'c-1' }, sk: { S: '2026-04-01' }, total: { N: '42' }, paid: { BOOL: true } },
  { pk: { S: 'c-1' }, sk: { S: '2026-04-02' }, total: { N: '7' }, paid: { BOOL: false } },
  { pk: { S: 'c-2' }, sk: { S: '2026-04-01' }, total: { N: '19' }, paid: { NULL: true } },
]

export const DDB_FIXTURES = {
  // ListTables (§9.1)
  listTables: { TableNames: ['orders', 'users'] },
  listTablesEmpty: { TableNames: [] as string[] },

  // DescribeTable (§9.2)
  describeTableOrders: { Table: orderTableBase },
  describeTableHashOnly: { Table: hashOnlyTableBase },

  // Scan (§9.3) — S, N (string-encoded), BOOL (true+false), NULL
  scanMixed: { Items: scanItems, Count: 3, ScannedCount: 3 },

  // Scan w/ LastEvaluatedKey — Pitfall 7.2.2 (map, not stringified blob)
  scanPaginated: {
    Items: scanItems,
    Count: 3,
    ScannedCount: 3,
    LastEvaluatedKey: { pk: { S: 'c-2' }, sk: { S: '2026-04-01' } },
  },

  scanEmpty: { Items: [] as unknown[], Count: 0, ScannedCount: 0 },

  // Query — base table, single pk
  queryResult: {
    Items: [{ pk: { S: 'c-1' }, sk: { S: '2026-04-01' }, total: { N: '42' } }],
    Count: 1,
    ScannedCount: 1,
  },

  // GetItem (§1.7)
  getItem: {
    Item: {
      pk: { S: 'c-1' },
      sk: { S: '2026-04-01' },
      total: { N: '42' },
      paid: { BOOL: true },
    },
  },
  getItemMissing: {} as Record<string, unknown>,

  // PutItem — ReturnValues=NONE (§9.4)
  putItemNone: {} as Record<string, unknown>,

  // UpdateItem — ReturnValues=ALL_NEW
  updateItemAllNew: {
    Attributes: {
      pk: { S: 'c-1' },
      sk: { S: '2026-04-01' },
      total: { N: '99' },
    },
  },

  // DeleteItem
  deleteItem: {} as Record<string, unknown>,

  // CreateTable — TableDescription.TableStatus=CREATING
  createTableResponse: {
    TableDescription: { ...orderTableBase, TableStatus: 'CREATING' as const },
  },

  // DeleteTable — TableDescription.TableStatus=DELETING
  deleteTableResponse: {
    TableDescription: { ...orderTableBase, TableStatus: 'DELETING' as const },
  },
} as const
