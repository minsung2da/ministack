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
import type { ReactNode } from 'react'
import { mswServer } from '../../../test/msw'
import { lambdaHandlers } from '../__tests__/msw-handlers'
import { TriggersPanel } from './TriggersPanel'
import { LAMBDA_FIXTURES } from '../__tests__/fixtures'
import { copy } from '../../../shared/copy'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  })
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>
}

// [LAM-03 / D-07] Triggers tab — read-only ESM + Function URL list.
describe('TriggersPanel', () => {
  test('renders ESM row with UUID, source ARN, state, batch size for "hello"', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<TriggersPanel functionName="hello" />))
    await waitFor(() => {
      expect(
        screen.getByText(LAMBDA_FIXTURES.esmsOne.EventSourceMappings[0].UUID),
      ).toBeDefined()
    })
    // Source ARN visible
    expect(
      screen.getByText(
        LAMBDA_FIXTURES.esmsOne.EventSourceMappings[0].EventSourceArn,
      ),
    ).toBeDefined()
    // Enabled state rendered
    expect(screen.getByText('Enabled')).toBeDefined()
    // Batch size 10
    expect(screen.getByText('10')).toBeDefined()
  })

  test('renders Function URL entry with AuthType and URL for "hello"', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<TriggersPanel functionName="hello" />))
    await waitFor(() => {
      expect(
        screen.getByText(
          LAMBDA_FIXTURES.functionUrlOne.FunctionUrlConfigs[0].FunctionUrl,
        ),
      ).toBeDefined()
    })
    expect(screen.getByText('NONE')).toBeDefined()
  })

  test('empty states for both sections when function has no triggers', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<TriggersPanel functionName="other-fn" />))
    await waitFor(() => {
      expect(screen.getByText(copy.lambda.triggersEsmsEmpty)).toBeDefined()
    })
    expect(screen.getByText(copy.lambda.triggersUrlsEmpty)).toBeDefined()
  })

  test('D-07: NO create/edit/delete controls rendered in the panel', async () => {
    mswServer.use(...lambdaHandlers)
    render(wrap(<TriggersPanel functionName="hello" />))
    await waitFor(() => {
      expect(
        screen.getByText(LAMBDA_FIXTURES.esmsOne.EventSourceMappings[0].UUID),
      ).toBeDefined()
    })
    // No mutation buttons (D-07)
    expect(
      screen.queryByRole('button', { name: /add|create|edit|delete/i }),
    ).toBeNull()
  })
})
