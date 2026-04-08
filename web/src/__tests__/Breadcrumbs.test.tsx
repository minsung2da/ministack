import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils'
import { Breadcrumbs } from '../app/Breadcrumbs'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [{ key: 'ec2', name: 'EC2', category: 'Compute' }],
    isLoading: false,
    error: null,
  }),
}))

describe('Breadcrumbs (NAV-03)', () => {
  beforeEach(() => navigateMock.mockReset())

  it('shows Console root at /', () => {
    renderWithProviders(<Breadcrumbs />, { route: '/' })
    expect(screen.getByText('Console')).toBeInTheDocument()
  })

  it('shows Console > EC2 at /services/ec2', () => {
    renderWithProviders(<Breadcrumbs />, { route: '/services/ec2' })
    expect(screen.getByText('Console')).toBeInTheDocument()
    expect(screen.getByText('EC2')).toBeInTheDocument()
  })

  it('calls navigate on breadcrumb click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Breadcrumbs />, { route: '/services/ec2' })
    const consoleCrumb = screen.getByText('Console')
    await user.click(consoleCrumb)
    expect(navigateMock).toHaveBeenCalledWith('/')
  })
})
