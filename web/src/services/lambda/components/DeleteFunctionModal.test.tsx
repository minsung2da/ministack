import {
  describe,
  test,
  expect,
  vi,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { http } from 'msw'
import { mswServer } from '../../../test/msw'
import { lambdaHandlers } from '../__tests__/msw-handlers'
import { DeleteFunctionModal } from './DeleteFunctionModal'

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
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>
}

describe('DeleteFunctionModal [LAM-01]', () => {
  test('Delete button disabled until confirm input equals function name', () => {
    render(
      wrap(
        <DeleteFunctionModal
          visible
          functionName="hello"
          onDismiss={() => {}}
          onDeleted={() => {}}
          onFailed={() => {}}
        />,
      ),
    )
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    expect(deleteBtn).toBeDisabled()

    const input = screen.getByPlaceholderText('hello')
    fireEvent.change(input, { target: { value: 'hell' } })
    expect(deleteBtn).toBeDisabled()

    fireEvent.change(input, { target: { value: 'hello' } })
    expect(deleteBtn).not.toBeDisabled()
  })

  test('DELETE URL never contains Qualifier query param (Pitfall 9)', async () => {
    mswServer.use(...lambdaHandlers)
    let capturedUrl = ''
    mswServer.use(
      http.delete('*/2015-03-31/functions/:name', ({ request }) => {
        capturedUrl = request.url
        return new Response(null, { status: 204 })
      }),
    )

    const onDeleted = vi.fn()
    render(
      wrap(
        <DeleteFunctionModal
          visible
          functionName="hello"
          onDismiss={() => {}}
          onDeleted={onDeleted}
          onFailed={() => {}}
        />,
      ),
    )
    fireEvent.change(screen.getByPlaceholderText('hello'), {
      target: { value: 'hello' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('hello'))
    expect(capturedUrl).not.toContain('Qualifier')
    expect(new URL(capturedUrl).search).toBe('')
    expect(new URL(capturedUrl).pathname).toBe('/2015-03-31/functions/hello')
  })

  test('surfaces backend error via onFailed callback', async () => {
    mswServer.use(
      http.delete('*/2015-03-31/functions/:name', () => {
        return new Response(
          JSON.stringify({ message: 'something exploded' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
      }),
    )
    const onFailed = vi.fn()
    render(
      wrap(
        <DeleteFunctionModal
          visible
          functionName="hello"
          onDismiss={() => {}}
          onDeleted={() => {}}
          onFailed={onFailed}
        />,
      ),
    )
    fireEvent.change(screen.getByPlaceholderText('hello'), {
      target: { value: 'hello' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onFailed).toHaveBeenCalled())
    expect(onFailed.mock.calls[0][0]).toBe('hello')
  })
})
