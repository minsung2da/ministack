import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/utils'
import { mswServer, http, HttpResponse } from '../test/msw'
import { setupMswForTest } from '../test/msw-setup'
import ServiceHome from '../pages/ServiceHome'

setupMswForTest()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return { ...actual, useParams: () => ({ serviceKey: 'dynamodb' }) }
})

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [{ key: 'dynamodb', name: 'DynamoDB', category: 'Database' }],
    isLoading: false,
    error: null,
  }),
}))

describe('ServiceHome — DynamoDB (NAV-04)', () => {
  it('shows "0 tables" when ListTables returns empty', async () => {
    mswServer.use(
      http.post('http://localhost/', async () => {
        return HttpResponse.json({ TableNames: [] })
      }),
    )
    renderWithProviders(<ServiceHome />, { route: '/services/dynamodb' })
    await waitFor(
      () => {
        expect(screen.getByText(/0 tables/i)).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })

  it('shows spinner while loading', async () => {
    mswServer.use(
      http.post('http://localhost/', async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({ TableNames: [] })
      }),
    )
    const { container } = renderWithProviders(<ServiceHome />, {
      route: '/services/dynamodb',
    })
    // Cloudscape Spinner renders as <span data-testid-name="Spinner">
    // with two circle children. Its root has a className starting with "awsui_root"
    // and nested class "awsui_size-large" when size="large". Query by the
    // stable class prefix that Cloudscape emits for the root spinner span.
    const spinner = container.querySelector('[class*="spinner" i], [class*="size-large"]')
    expect(spinner).not.toBeNull()
  })
})
