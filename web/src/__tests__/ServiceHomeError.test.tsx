import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('ServiceHome error state (NAV-04)', () => {
  it('renders Alert with Try Again button on API error and refetches on click', async () => {
    let callCount = 0
    mswServer.use(
      http.post('http://localhost/', async () => {
        callCount++
        if (callCount === 1) {
          return new HttpResponse('boom', { status: 500 })
        }
        return HttpResponse.json({ TableNames: ['alpha', 'beta'] })
      }),
    )

    renderWithProviders(<ServiceHome />, { route: '/services/dynamodb' })

    await waitFor(() => {
      expect(screen.getByText(/Could not load resources/i)).toBeInTheDocument()
    })

    const retry = screen.getByRole('button', { name: /Try Again/i })
    const user = userEvent.setup()
    await user.click(retry)

    await waitFor(() => {
      expect(screen.getByText(/2 tables/i)).toBeInTheDocument()
    })
  })
})
