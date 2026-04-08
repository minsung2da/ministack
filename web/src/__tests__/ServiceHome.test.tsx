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
      http.post('http://localhost/', async ({ request }) => {
        const target = request.headers.get('x-amz-target') ?? ''
        if (target.endsWith('ListTables')) {
          return HttpResponse.json({ TableNames: [] })
        }
        return new HttpResponse(null, { status: 404 })
      }),
    )
    renderWithProviders(<ServiceHome />, { route: '/services/dynamodb' })
    await waitFor(() => {
      expect(screen.getByText(/0 tables/i)).toBeInTheDocument()
    })
  })

  it('shows spinner while loading', async () => {
    mswServer.use(
      http.post('http://localhost/', async () => {
        await new Promise((r) => setTimeout(r, 50))
        return HttpResponse.json({ TableNames: [] })
      }),
    )
    renderWithProviders(<ServiceHome />, { route: '/services/dynamodb' })
    // Cloudscape Spinner exposes role="status"
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
