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
import { DeleteItemModal } from './DeleteItemModal'
import type { DdbTableDescription } from '../../../shared/types/ddb'

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

const tableDesc: DdbTableDescription & {
  hashKey: string | null
  sortKey: string | null
} = {
  TableName: 'orders',
  KeySchema: [
    { AttributeName: 'pk', KeyType: 'HASH' },
    { AttributeName: 'sk', KeyType: 'RANGE' },
  ],
  AttributeDefinitions: [
    { AttributeName: 'pk', AttributeType: 'S' },
    { AttributeName: 'sk', AttributeType: 'S' },
  ],
  TableStatus: 'ACTIVE',
  CreationDateTime: 1713350000,
  ItemCount: 0,
  TableSizeBytes: 0,
  TableArn: 'arn:test',
  TableId: 'x',
  hashKey: 'pk',
  sortKey: 'sk',
}

describe('DeleteItemModal [DDB-03]', () => {
  test('Delete button disabled until confirm input matches "pk#sk" stringified', () => {
    render(
      wrap(
        <DeleteItemModal
          visible
          tableDescription={tableDesc}
          itemKey={{ pk: { S: 'c-1' }, sk: { S: '2026-04-01' } }}
          onDismiss={() => {}}
          onDeleted={() => {}}
          onFailed={() => {}}
        />,
      ),
    )
    const expected = 'c-1#2026-04-01'
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    expect(deleteBtn).toBeDisabled()
    const input = screen.getByPlaceholderText(expected)
    fireEvent.change(input, { target: { value: 'c-1#2026-04-0' } })
    expect(deleteBtn).toBeDisabled()
    fireEvent.change(input, { target: { value: expected } })
    expect(deleteBtn).not.toBeDisabled()
  })

  test('successful delete fires onDeleted and sends Key map verbatim', async () => {
    let capturedKey: unknown
    mswServer.use(
      http.post('*/', async ({ request }) => {
        const target = request.headers.get('x-amz-target') ?? ''
        if (target !== 'DynamoDB_20120810.DeleteItem') return
        const body = (await request.json()) as { Key: unknown }
        capturedKey = body.Key
        return HttpResponse.json(
          {},
          { headers: { 'Content-Type': 'application/x-amz-json-1.0' } },
        )
      }),
    )
    const onDeleted = vi.fn()
    const itemKey = { pk: { S: 'c-1' }, sk: { S: '2026-04-01' } }
    render(
      wrap(
        <DeleteItemModal
          visible
          tableDescription={tableDesc}
          itemKey={itemKey}
          onDismiss={() => {}}
          onDeleted={onDeleted}
          onFailed={() => {}}
        />,
      ),
    )
    fireEvent.change(screen.getByPlaceholderText('c-1#2026-04-01'), {
      target: { value: 'c-1#2026-04-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    expect(capturedKey).toEqual(itemKey)
  })
})
