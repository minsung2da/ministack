import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils'
import { TopBar } from '../app/TopBar'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [
      { key: 'ec2', name: 'EC2', category: 'Compute' },
      { key: 's3', name: 'S3', category: 'Storage' },
      { key: 'dynamodb', name: 'DynamoDB', category: 'Database' },
    ],
    isLoading: false,
    error: null,
  }),
}))

describe('TopBar service search (NAV-01)', () => {
  beforeEach(() => navigateMock.mockReset())

  it('filters services case-insensitive substring on type', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopBar />)
    const input = screen.getByPlaceholderText('Search services')
    await user.click(input)
    await user.type(input, 'ec')
    expect(await screen.findByText('EC2')).toBeInTheDocument()
  })

  it('navigates to /services/:key when an option is selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopBar />)
    const input = screen.getByPlaceholderText('Search services')
    await user.click(input)
    await user.type(input, 'EC2')
    const option = await screen.findByText('EC2')
    await user.click(option)
    expect(navigateMock).toHaveBeenCalledWith('/services/ec2')
  })
})
