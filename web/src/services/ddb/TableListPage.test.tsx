import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { mswServer } from '../../test/msw'
import { ddbHandlers } from './__tests__/msw-handlers'
import TableListPage from './TableListPage'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/services/ddb']}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('TableListPage [DDB-01]', () => {
  test('renders DDB heading', async () => {
    mswServer.use(...ddbHandlers)
    render(wrap(<TableListPage />))
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'DynamoDB', level: 1 }),
      ).toBeDefined(),
    )
  })

  test('renders table names from ListTables fixture as links', async () => {
    mswServer.use(...ddbHandlers)
    render(wrap(<TableListPage />))
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'orders' })).toBeDefined()
    })
    expect(screen.getByRole('link', { name: 'users' })).toBeDefined()
  })

  test('Create table button opens CreateTableModal', async () => {
    mswServer.use(...ddbHandlers)
    render(wrap(<TableListPage />))
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'orders' })).toBeDefined(),
    )
    const createButtons = screen.getAllByRole('button', { name: 'Create table' })
    fireEvent.click(createButtons[0])
    // Modal-specific field
    await waitFor(() => {
      expect(screen.getByText('Billing mode')).toBeDefined()
    })
  })
})
