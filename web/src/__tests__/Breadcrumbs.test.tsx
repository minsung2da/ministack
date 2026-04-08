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
    // Cloudscape BreadcrumbGroup renders a hidden "ghost" copy for measurement,
    // so 'Console' appears more than once in the DOM. We assert presence, not count.
    expect(screen.getAllByText('Console').length).toBeGreaterThan(0)
  })

  it('shows Console > EC2 at /services/ec2', () => {
    renderWithProviders(<Breadcrumbs />, { route: '/services/ec2' })
    expect(screen.getAllByText('Console').length).toBeGreaterThan(0)
    expect(screen.getAllByText('EC2').length).toBeGreaterThan(0)
  })

  it('calls navigate on breadcrumb click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Breadcrumbs />, { route: '/services/ec2' })
    // Click the visible (non-ghost) Console anchor — first match in document order
    // is the real one; the ghost copy is rendered after for layout measurement.
    const consoleCrumb = screen.getAllByText('Console')[0]
    await user.click(consoleCrumb)
    expect(navigateMock).toHaveBeenCalledWith('/')
  })
})
