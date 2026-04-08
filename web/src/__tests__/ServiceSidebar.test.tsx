import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils'
import { Sidebar } from '../app/Sidebar'

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [
      { key: 'lambda', name: 'Lambda', category: 'Compute' },
      { key: 'ec2', name: 'EC2', category: 'Compute' },
      { key: 's3', name: 'S3', category: 'Storage' },
      { key: 'dynamodb', name: 'DynamoDB', category: 'Database' },
      { key: 'sqs', name: 'SQS', category: 'Application Integration' },
    ],
    isLoading: false,
    error: null,
  }),
}))

describe('Sidebar (NAV-02)', () => {
  it('renders services grouped by category from useServices()', () => {
    renderWithProviders(<Sidebar />)
    expect(screen.getByText('EC2')).toBeInTheDocument()
    expect(screen.getByText('Lambda')).toBeInTheDocument()
    expect(screen.getByText('S3')).toBeInTheDocument()
    expect(screen.getByText('DynamoDB')).toBeInTheDocument()
    expect(screen.getByText('SQS')).toBeInTheDocument()
    expect(screen.getByText('Compute')).toBeInTheDocument()
    expect(screen.getByText('Storage')).toBeInTheDocument()
    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('Application Integration')).toBeInTheDocument()
  })

  it('hides empty categories (Management & Governance, Security, Identity & Compliance)', () => {
    renderWithProviders(<Sidebar />)
    expect(screen.queryByText('Management & Governance')).toBeNull()
    expect(screen.queryByText('Security, Identity & Compliance')).toBeNull()
    expect(screen.queryByText('Networking & Content Delivery')).toBeNull()
    expect(screen.queryByText('Other')).toBeNull()
  })

  it('sorts service items alphabetically within Compute (EC2 before Lambda)', () => {
    renderWithProviders(<Sidebar />)
    const ec2 = screen.getByText('EC2')
    const lambda = screen.getByText('Lambda')
    expect(
      ec2.compareDocumentPosition(lambda) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
