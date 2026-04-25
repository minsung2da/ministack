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
import { http, HttpResponse } from 'msw'
import { mswServer } from '../../../test/msw'
import { DeleteTableModal } from './DeleteTableModal'

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

describe('DeleteTableModal [DDB-01]', () => {
  test('Delete button disabled until confirm input matches tableName', () => {
    render(
      wrap(
        <DeleteTableModal
          visible
          tableName="orders"
          onDismiss={() => {}}
          onDeleted={() => {}}
          onFailed={() => {}}
        />,
      ),
    )
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    expect(deleteBtn).toBeDisabled()
    const input = screen.getByPlaceholderText('orders')
    fireEvent.change(input, { target: { value: 'order' } })
    expect(deleteBtn).toBeDisabled()
    fireEvent.change(input, { target: { value: 'orders' } })
    expect(deleteBtn).not.toBeDisabled()
  })

  test('successful delete invokes onDeleted with tableName', async () => {
    mswServer.use(
      http.post('*/', async ({ request }) => {
        const target = request.headers.get('x-amz-target') ?? ''
        if (target !== 'DynamoDB_20120810.DeleteTable') return
        return HttpResponse.json(
          { TableDescription: { TableName: 'orders', TableStatus: 'DELETING' } },
          { headers: { 'Content-Type': 'application/x-amz-json-1.0' } },
        )
      }),
    )
    const onDeleted = vi.fn()
    render(
      wrap(
        <DeleteTableModal
          visible
          tableName="orders"
          onDismiss={() => {}}
          onDeleted={onDeleted}
          onFailed={() => {}}
        />,
      ),
    )
    fireEvent.change(screen.getByPlaceholderText('orders'), {
      target: { value: 'orders' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('orders'))
  })

  test('backend error surfaces via onFailed', async () => {
    mswServer.use(
      http.post('*/', ({ request }) => {
        const target = request.headers.get('x-amz-target') ?? ''
        if (target !== 'DynamoDB_20120810.DeleteTable') return
        return new Response(
          JSON.stringify({ message: 'table not empty' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }),
    )
    const onFailed = vi.fn()
    render(
      wrap(
        <DeleteTableModal
          visible
          tableName="orders"
          onDismiss={() => {}}
          onDeleted={() => {}}
          onFailed={onFailed}
        />,
      ),
    )
    fireEvent.change(screen.getByPlaceholderText('orders'), {
      target: { value: 'orders' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onFailed).toHaveBeenCalled())
    expect(onFailed.mock.calls[0][0]).toBe('orders')
  })
})
