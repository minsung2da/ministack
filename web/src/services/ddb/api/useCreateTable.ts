import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ddbJsonCall } from './ddbClient'
import { ddbKeys } from './ddbKeys'

/**
 * useCreateTable — Mutation wrapping CreateTable.
 *
 * Pitfall C-3: single `invalidateQueries` call on success, at the closest
 * ancestor — `ddbKeys.tables()`. We intentionally do NOT cascade to
 * `ddbKeys.table(name)` / `ddbKeys.all` — the table does not exist in the
 * detail cache yet, and over-invalidating evicts unrelated tables' caches.
 */
export type CreateTableKeyDefinition = {
  name: string
  type: 'S' | 'N' | 'B'
}

export type CreateTableInput = {
  TableName: string
  hashKey: CreateTableKeyDefinition
  sortKey?: CreateTableKeyDefinition
  billingMode?: 'PAY_PER_REQUEST' | 'PROVISIONED'
  rcu?: number
  wcu?: number
}

export function useCreateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTableInput) => {
      const AttributeDefinitions: Array<{
        AttributeName: string
        AttributeType: 'S' | 'N' | 'B'
      }> = [
        { AttributeName: input.hashKey.name, AttributeType: input.hashKey.type },
      ]
      const KeySchema: Array<{
        AttributeName: string
        KeyType: 'HASH' | 'RANGE'
      }> = [{ AttributeName: input.hashKey.name, KeyType: 'HASH' }]
      if (input.sortKey) {
        AttributeDefinitions.push({
          AttributeName: input.sortKey.name,
          AttributeType: input.sortKey.type,
        })
        KeySchema.push({
          AttributeName: input.sortKey.name,
          KeyType: 'RANGE',
        })
      }
      const body: Record<string, unknown> = {
        TableName: input.TableName,
        AttributeDefinitions,
        KeySchema,
        BillingMode: input.billingMode ?? 'PAY_PER_REQUEST',
      }
      if (input.billingMode === 'PROVISIONED') {
        body.ProvisionedThroughput = {
          ReadCapacityUnits: input.rcu ?? 5,
          WriteCapacityUnits: input.wcu ?? 5,
        }
      }
      return ddbJsonCall('CreateTable', body)
    },
    // Pitfall C-3: exactly ONE invalidate.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ddbKeys.tables() })
    },
  })
}
