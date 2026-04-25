/**
 * DynamoDB (Phase 5) shared types.
 *
 * Wire contract sources:
 * - AttributeValue wire format: 05-RESEARCH.md §3 (lines 473–508)
 * - Table description shape: 05-RESEARCH.md §1.2
 *
 * D-06 scope: schema-based form supports S / N / B / BOOL / NULL only.
 * Complex types (L / M / SS / NS / BS) are surfaced on the read path
 * as pass-through values; on the write path the form blocks them and
 * users must drop to JSON advanced mode.
 *
 * Pitfall 7.2.1: N is ALWAYS a string on the wire — never a JS number.
 */

export type DdbScalarType = 'S' | 'N' | 'B' | 'BOOL' | 'NULL'

// Scalars (D-06 in-scope)
export type DdbScalarAttributeValue =
  | { S: string }
  | { N: string } // Pitfall 7.2.1: ALWAYS string on the wire
  | { BOOL: boolean }
  | { NULL: true }
  | { B: string } // base64-encoded

// Complex types (D-06 out of form scope — pass-through only)
export type DdbComplexAttributeValue =
  | { L: DdbAttributeValue[] }
  | { M: Record<string, DdbAttributeValue> }
  | { SS: string[] }
  | { NS: string[] } // each element is a stringified number
  | { BS: string[] } // each element is base64

export type DdbAttributeValue =
  | DdbScalarAttributeValue
  | DdbComplexAttributeValue

export type DdbItem = Record<string, DdbAttributeValue>

export type DdbKeySchemaEntry = {
  AttributeName: string
  KeyType: 'HASH' | 'RANGE'
}

export type DdbAttributeDefinition = {
  AttributeName: string
  // AWS allows only S / N / B for key attributes.
  AttributeType: 'S' | 'N' | 'B'
}

export type DdbTableSummary = { TableName: string }

export type DdbTableDescription = {
  TableName: string
  KeySchema: DdbKeySchemaEntry[]
  AttributeDefinitions: DdbAttributeDefinition[]
  TableStatus: string // 'ACTIVE' | 'CREATING' | 'DELETING' | ...
  CreationDateTime: number
  ItemCount: number
  TableSizeBytes: number
  TableArn: string
  TableId: string
  ProvisionedThroughput?: {
    ReadCapacityUnits: number
    WriteCapacityUnits: number
  }
  BillingModeSummary?: {
    BillingMode: 'PROVISIONED' | 'PAY_PER_REQUEST'
  }
  GlobalSecondaryIndexes?: unknown[] // out of scope for Phase 5 UI
  LocalSecondaryIndexes?: unknown[] // out of scope for Phase 5 UI
}
