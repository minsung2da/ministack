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
import { CreateTableModal } from './CreateTableModal'

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

type CreateTableCapture = {
  TableName?: string
  BillingMode?: string
  ProvisionedThroughput?: { ReadCapacityUnits: number; WriteCapacityUnits: number }
  KeySchema?: Array<{ AttributeName: string; KeyType: string }>
  AttributeDefinitions?: Array<{ AttributeName: string; AttributeType: string }>
}

function stubCreateTable(capture: { body?: CreateTableCapture }) {
  mswServer.use(
    http.post('*/', async ({ request }) => {
      const target = request.headers.get('x-amz-target') ?? ''
      if (target !== 'DynamoDB_20120810.CreateTable') return
      capture.body = (await request.json()) as CreateTableCapture
      return HttpResponse.json(
        { TableDescription: { TableName: capture.body?.TableName } },
        { headers: { 'Content-Type': 'application/x-amz-json-1.0' } },
      )
    }),
  )
}

describe('CreateTableModal [DDB-01]', () => {
  test('default billing mode is PAY_PER_REQUEST (no RCU/WCU inputs rendered)', () => {
    render(
      wrap(
        <CreateTableModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    // On-demand radio is checked by default
    const onDemandRadio = document.querySelector<HTMLInputElement>(
      'input[type="radio"][value="PAY_PER_REQUEST"]',
    )
    expect(onDemandRadio).toBeTruthy()
    expect(onDemandRadio!.checked).toBe(true)
    // RCU/WCU labels are NOT rendered under PAY_PER_REQUEST
    expect(screen.queryByText('Read capacity units')).toBeNull()
    expect(screen.queryByText('Write capacity units')).toBeNull()
  })

  test('switching to PROVISIONED reveals RCU/WCU inputs', () => {
    render(
      wrap(
        <CreateTableModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    const provRadio = document.querySelector<HTMLInputElement>(
      'input[type="radio"][value="PROVISIONED"]',
    )
    expect(provRadio).toBeTruthy()
    fireEvent.click(provRadio!)
    expect(screen.getByText('Read capacity units')).toBeDefined()
    expect(screen.getByText('Write capacity units')).toBeDefined()
  })

  test('default create omits ProvisionedThroughput in body', async () => {
    const capture: { body?: CreateTableCapture } = {}
    stubCreateTable(capture)
    const onCreated = vi.fn()
    render(
      wrap(
        <CreateTableModal
          visible
          onDismiss={() => {}}
          onCreated={onCreated}
        />,
      ),
    )
    fireEvent.change(screen.getByPlaceholderText('my-table'), {
      target: { value: 'orders' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('orders'))
    expect(capture.body?.BillingMode).toBe('PAY_PER_REQUEST')
    expect(capture.body?.ProvisionedThroughput).toBeUndefined()
    expect(capture.body?.KeySchema?.[0]).toEqual({
      AttributeName: 'pk',
      KeyType: 'HASH',
    })
  })

  test('PROVISIONED create sends ProvisionedThroughput', async () => {
    const capture: { body?: CreateTableCapture } = {}
    stubCreateTable(capture)
    const onCreated = vi.fn()
    render(
      wrap(
        <CreateTableModal
          visible
          onDismiss={() => {}}
          onCreated={onCreated}
        />,
      ),
    )
    fireEvent.change(screen.getByPlaceholderText('my-table'), {
      target: { value: 'orders' },
    })
    fireEvent.click(
      document.querySelector<HTMLInputElement>(
        'input[type="radio"][value="PROVISIONED"]',
      )!,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(capture.body?.BillingMode).toBe('PROVISIONED')
    expect(capture.body?.ProvisionedThroughput).toEqual({
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    })
  })

  test('state resets on re-open (Plan 03-03 Rule 2)', () => {
    const { rerender } = render(
      wrap(
        <CreateTableModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    fireEvent.change(screen.getByPlaceholderText('my-table'), {
      target: { value: 'orders' },
    })
    expect(
      (screen.getByPlaceholderText('my-table') as HTMLInputElement).value,
    ).toBe('orders')
    // Close modal
    rerender(
      wrap(
        <CreateTableModal
          visible={false}
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    // Re-open
    rerender(
      wrap(
        <CreateTableModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    expect(
      (screen.getByPlaceholderText('my-table') as HTMLInputElement).value,
    ).toBe('')
  })
})
