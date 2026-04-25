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
import { lambdaHandlers } from './__tests__/msw-handlers'
import FunctionListPage from './FunctionListPage'

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
      <MemoryRouter initialEntries={['/services/lambda']}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('FunctionListPage [LAM-01]', () => {
  test('renders FunctionTable fed by useFunctions (hello + goodbye from fixtures)', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<FunctionListPage />))
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'hello' })).toBeDefined()
    })
    expect(screen.getByRole('link', { name: 'goodbye' })).toBeDefined()
  })

  test('Create function button opens CreateFunctionModal', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<FunctionListPage />))
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'hello' })).toBeDefined(),
    )
    // There can be multiple "Create function" buttons (header + empty state).
    const createButtons = screen.getAllByRole('button', {
      name: 'Create function',
    })
    fireEvent.click(createButtons[0])
    await waitFor(() =>
      expect(screen.getAllByText('Create function').length).toBeGreaterThan(0),
    )
    // Modal-specific field visible
    expect(screen.getByText('Execution role ARN')).toBeDefined()
  })

  test('route /services/lambda page renders Lambda heading (before /:serviceKey wildcard)', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<FunctionListPage />))
    await waitFor(() =>
      // The h1 is "Lambda" per copy.lambda.serviceHeading
      expect(
        screen.getByRole('heading', { name: 'Lambda', level: 1 }),
      ).toBeDefined(),
    )
  })
})
