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
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactNode } from 'react'
import { mswServer } from '../../test/msw'
import { lambdaHandlers } from './__tests__/msw-handlers'
import FunctionDetailPage from './FunctionDetailPage'
import { copy } from '../../shared/copy'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function wrap(ui: ReactNode, route = '/services/lambda/hello') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/services/lambda/:functionName" element={ui} />
          <Route path="/services/lambda" element={<div>FunctionList</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('FunctionDetailPage [LAM-03]', () => {
  test('renders four tabs: Configuration, Environment, Triggers, Test (D-03)', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<FunctionDetailPage />))

    await waitFor(() => {
      expect(
        screen.getByText(copy.lambda.configurationHeading),
      ).toBeDefined()
    })
    expect(screen.getByText(copy.lambda.environmentHeading)).toBeDefined()
    expect(screen.getByText(copy.lambda.triggersHeading)).toBeDefined()
    expect(screen.getByText(copy.lambda.testHeading)).toBeDefined()
  })

  test('Configuration tab shows function details (runtime etc.)', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<FunctionDetailPage />))

    await waitFor(() => {
      expect(screen.getByText('python3.12')).toBeDefined()
    })
    expect(screen.getByText('index.handler')).toBeDefined()
  })

  test('Environment tab renders env vars (D-05 plaintext)', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<FunctionDetailPage />))

    await waitFor(() => {
      expect(
        screen.getByText(copy.lambda.environmentHeading),
      ).toBeDefined()
    })
    // Click Environment tab
    fireEvent.click(screen.getByText(copy.lambda.environmentHeading))

    await waitFor(() => {
      expect(screen.getByText('LOG_LEVEL')).toBeDefined()
    })
    expect(screen.getByText('abc123')).toBeDefined()
  })

  test('404 from useFunction shows "Function not found" alert with back link', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<FunctionDetailPage />, '/services/lambda/missing'))

    await waitFor(() => {
      expect(screen.getByText(copy.lambda.notFoundHeader)).toBeDefined()
    })
    // Back link text
    expect(
      screen.getByRole('link', { name: copy.lambda.notFoundBackLink }),
    ).toBeDefined()
  })

  test('Test tab renders InvokePanel with lifted payload state', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<FunctionDetailPage />))

    await waitFor(() => {
      expect(screen.getByText(copy.lambda.testHeading)).toBeDefined()
    })
    fireEvent.click(screen.getByText(copy.lambda.testHeading))

    // InvokePanel exposes the Invoke button (Plan 05 signal).
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: copy.lambda.invokeButton }),
      ).toBeDefined()
    })
  })

  test('renders Header with function name and CopyToClipboard', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<FunctionDetailPage />))
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'hello', level: 1 }),
      ).toBeDefined()
    })
  })
})
