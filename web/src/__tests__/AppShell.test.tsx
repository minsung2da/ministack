import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils'
import { ConsoleShell } from '../app/ConsoleShell'

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [
      { key: 'ec2', name: 'EC2', category: 'Compute' },
      { key: 's3', name: 'S3', category: 'Storage' },
    ],
    isLoading: false,
    error: null,
  }),
}))

describe('ConsoleShell (Plan 04)', () => {
  it('renders TopBar brand, Sidebar services header, and Breadcrumbs root', () => {
    renderWithProviders(<ConsoleShell />, { route: '/' })
    expect(screen.getAllByText('MiniStack').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Services').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Console').length).toBeGreaterThan(0)
  })

  it('wires headerSelector="#top-nav" via id="top-nav" on TopBar (Pitfall #4 regression)', () => {
    const { container } = renderWithProviders(<ConsoleShell />, { route: '/' })
    expect(container.querySelector('#top-nav')).not.toBeNull()
  })
})
