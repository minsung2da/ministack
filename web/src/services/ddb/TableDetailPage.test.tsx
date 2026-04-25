import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http } from 'msw'
import { mswServer } from '../../test/msw'
import { ddbHandlers } from './__tests__/msw-handlers'
import {
  SplitPanelProvider,
} from '../../contexts/SplitPanelContext'
import TableDetailPage from './TableDetailPage'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function wrap(path: string) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
  return (
    <QueryClientProvider client={client}>
      <SplitPanelProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              path="/services/ddb/:tableName"
              element={<TableDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </SplitPanelProvider>
    </QueryClientProvider>
  )
}

describe('TableDetailPage [DDB-02]', () => {
  test('renders exactly 2 tabs (Items, Configuration); no Triggers/Test', async () => {
    mswServer.use(...ddbHandlers)
    render(wrap('/services/ddb/orders'))
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Items' })).toBeDefined()
    })
    expect(screen.getByRole('tab', { name: 'Configuration' })).toBeDefined()
    // DDB has no Triggers / Test tab surfaces
    expect(screen.queryByRole('tab', { name: 'Triggers' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Test' })).toBeNull()
  })

  test('renders table name as h1 header', async () => {
    mswServer.use(...ddbHandlers)
    render(wrap('/services/ddb/orders'))
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'orders', level: 1 }),
      ).toBeDefined(),
    )
  })

  test('404 error surfaces "Table not found" alert with back link', async () => {
    mswServer.use(
      http.post('*/', ({ request }) => {
        const target = request.headers.get('x-amz-target') ?? ''
        if (target === 'DynamoDB_20120810.DescribeTable') {
          return new Response(
            JSON.stringify({
              __type: 'ResourceNotFoundException',
              message: 'not found',
            }),
            {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      }),
    )
    render(wrap('/services/ddb/ghost'))
    await waitFor(() => {
      expect(screen.getByText(/table not found/i)).toBeDefined()
    })
    expect(screen.getByRole('link', { name: /back to tables/i })).toBeDefined()
  })
})
