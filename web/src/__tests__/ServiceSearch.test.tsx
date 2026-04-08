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

// Cloudscape TopNavigation renders both a "wide" and "narrow" copy of its
// children via internal ResizeObserver-driven responsive logic, so the
// Autosuggest input shows up multiple times in jsdom. The first match is the
// primary (visible) instance.
function getSearchInput() {
  const inputs = screen.getAllByPlaceholderText('Search services')
  return inputs[0]
}

describe('TopBar service search (NAV-01)', () => {
  beforeEach(() => navigateMock.mockReset())

  it('filters services case-insensitive substring on type', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopBar />)
    const input = getSearchInput()
    await user.click(input)
    // Cloudscape Autosuggest filteringType="auto" performs case-insensitive
    // substring matching against the option value/label. Typing 'EC' must
    // surface 'EC2' (and exclude 'S3', 'DynamoDB'). Cloudscape highlights the
    // matched substring with <mark>, splitting the text node — so we match
    // the option container by data-value rather than text content.
    await user.type(input, 'EC')
    const matches = await screen.findAllByTitle('EC2')
    expect(matches.length).toBeGreaterThan(0)
    // Negative assertion: 'S3' and 'DynamoDB' must not appear in the dropdown.
    expect(document.querySelector('[data-value="S3"]')).toBeNull()
    expect(document.querySelector('[data-value="DynamoDB"]')).toBeNull()
  })

  it('navigates to /services/:key when an option is selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopBar />)
    const input = getSearchInput()
    await user.click(input)
    await user.type(input, 'EC2')
    const options = await screen.findAllByText('EC2')
    // The dropdown option (not the entered-text-label) is the last EC2 occurrence
    // in document order. Click it to trigger onSelect.
    await user.click(options[options.length - 1])
    expect(navigateMock).toHaveBeenCalledWith('/services/ec2')
  })
})
