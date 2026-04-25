import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { mswServer } from '../../../test/msw'
import { lambdaHandlers } from '../__tests__/msw-handlers'
import { InvokePanel } from './InvokePanel'
import { copy } from '../../../shared/copy'

/**
 * [LAM-02 / D-04 + D-06 + D-09] InvokePanel — payload editor + Invoke button
 * + cold-start spinner copy state machine + result display.
 *
 * Uses real fake timers for the 3-second copy swap assertion (D-09).
 */

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  mswServer.resetHandlers()
  vi.useRealTimers()
})
afterAll(() => mswServer.close())

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

function Wrapper({
  children,
  client,
}: {
  children: ReactNode
  client: QueryClient
}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function Harness({
  functionName = 'hello',
  initialPayload = '{}',
}: {
  functionName?: string
  initialPayload?: string
}) {
  const [payload, setPayload] = useState(initialPayload)
  return (
    <InvokePanel
      functionName={functionName}
      payload={payload}
      onPayloadChange={setPayload}
    />
  )
}

describe('InvokePanel', () => {
  test('Invoke button disabled when payload is invalid JSON (D-04)', async () => {
    mswServer.use(...lambdaHandlers)
    const client = makeQueryClient()
    render(
      <Wrapper client={client}>
        <Harness initialPayload="{invalid" />
      </Wrapper>,
    )
    await waitFor(() => {
      const btn = screen.getByRole('button', {
        name: copy.lambda.invokeButton,
      }) as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })
  })

  test('Invoke button enabled for valid JSON', async () => {
    mswServer.use(...lambdaHandlers)
    const client = makeQueryClient()
    render(
      <Wrapper client={client}>
        <Harness initialPayload='{"x":1}' />
      </Wrapper>,
    )
    await waitFor(() => {
      const btn = screen.getByRole('button', {
        name: copy.lambda.invokeButton,
      }) as HTMLButtonElement
      expect(btn.disabled).toBe(false)
    })
  })

  test('click Invoke → InvokeResult renders on success with Response body', async () => {
    mswServer.use(...lambdaHandlers)
    const client = makeQueryClient()
    render(
      <Wrapper client={client}>
        <Harness initialPayload='{"x":1}' />
      </Wrapper>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: copy.lambda.invokeButton }),
    )
    await waitFor(
      () => {
        // Response header appears only after InvokeResult mounts.
        expect(screen.getByText(copy.lambda.invokeResponseHeader)).toBeDefined()
      },
      { timeout: 5000 },
    )
    expect(
      screen.getByText((t) => t.includes('"statusCode": 200')),
    ).toBeDefined()
  })

  test('function-error path renders red Alert above Response (Pitfall 2)', async () => {
    mswServer.use(...lambdaHandlers)
    const client = makeQueryClient()
    render(
      <Wrapper client={client}>
        <Harness functionName="boom" initialPayload="{}" />
      </Wrapper>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: copy.lambda.invokeButton }),
    )
    await waitFor(
      () => {
        expect(
          screen.getByText(copy.lambda.invokeFunctionErrorHeading),
        ).toBeDefined()
      },
      { timeout: 5000 },
    )
    // Response still rendered (D-06): the heading exists.
    expect(screen.getByText(copy.lambda.invokeResponseHeader)).toBeDefined()
  })

  test('no Cancel button rendered (D-09)', () => {
    mswServer.use(...lambdaHandlers)
    const client = makeQueryClient()
    render(
      <Wrapper client={client}>
        <Harness />
      </Wrapper>,
    )
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull()
  })

  test('invoke is cache-neutral — invalidateQueries never called (Pitfall 6)', async () => {
    mswServer.use(...lambdaHandlers)
    const client = makeQueryClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    render(
      <Wrapper client={client}>
        <Harness initialPayload='{"x":1}' />
      </Wrapper>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: copy.lambda.invokeButton }),
    )
    await waitFor(
      () => {
        expect(screen.getByText(copy.lambda.invokeResponseHeader)).toBeDefined()
      },
      { timeout: 5000 },
    )
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  test('spinner copy swaps at 3 seconds (D-09) — never-resolving handler', async () => {
    // Override invoke with a never-resolving handler so we can observe the
    // pending state across the 3-second copy swap. Use real timers — the
    // test only waits 3.1 seconds total.
    const { http } = await import('msw')
    mswServer.use(
      http.post('*/2015-03-31/functions/:name/invocations', () => {
        return new Promise(() => {}) as any
      }),
    )
    const client = makeQueryClient()
    render(
      <Wrapper client={client}>
        <Harness initialPayload='{"x":1}' />
      </Wrapper>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: copy.lambda.invokeButton }),
    )
    // Initial copy appears
    await waitFor(() => {
      expect(screen.getByText(copy.lambda.invokingCopy)).toBeDefined()
    })
    // After 3s, copy swaps
    await waitFor(
      () => {
        expect(screen.getByText(copy.lambda.stillInvokingCopy)).toBeDefined()
      },
      { timeout: 5000, interval: 100 },
    )
  })
})
