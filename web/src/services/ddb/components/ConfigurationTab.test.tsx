import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfigurationTab } from './ConfigurationTab'
import type { DdbTableDescription } from '../../../shared/types/ddb'

const baseTable: DdbTableDescription & {
  hashKey: string | null
  sortKey: string | null
} = {
  TableName: 'orders',
  KeySchema: [
    { AttributeName: 'pk', KeyType: 'HASH' },
    { AttributeName: 'sk', KeyType: 'RANGE' },
  ],
  AttributeDefinitions: [
    { AttributeName: 'pk', AttributeType: 'S' },
    { AttributeName: 'sk', AttributeType: 'S' },
  ],
  TableStatus: 'ACTIVE',
  CreationDateTime: 1713350000,
  ItemCount: 3,
  TableSizeBytes: 512,
  TableArn: 'arn:aws:dynamodb:us-east-1:000000000000:table/orders',
  TableId: 'abc',
  BillingModeSummary: { BillingMode: 'PAY_PER_REQUEST' },
  hashKey: 'pk',
  sortKey: 'sk',
}

describe('ConfigurationTab [DDB-02]', () => {
  test('renders read-only (no action buttons)', () => {
    render(<ConfigurationTab tableDescription={baseTable} />)
    expect(
      screen.queryByRole('button', { name: /add|create|edit|delete/i }),
    ).toBeNull()
  })

  test('renders KeySchema + AttributeDefinitions attribute names', () => {
    render(<ConfigurationTab tableDescription={baseTable} />)
    // HASH / RANGE badges
    expect(screen.getByText('HASH')).toBeDefined()
    expect(screen.getByText('RANGE')).toBeDefined()
    // Attribute definitions table — "pk" and "sk" appear
    expect(screen.getAllByText('pk').length).toBeGreaterThan(0)
    expect(screen.getAllByText('sk').length).toBeGreaterThan(0)
  })

  test('no secondary indexes message when GSIs absent', () => {
    render(<ConfigurationTab tableDescription={baseTable} />)
    expect(screen.getByText(/no secondary indexes/i)).toBeDefined()
  })
})
