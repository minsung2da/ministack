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
import { PutItemModal } from './PutItemModal'
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
  KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
  AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }],
  TableStatus: 'ACTIVE',
  CreationDateTime: 1713350000,
  ItemCount: 0,
  TableSizeBytes: 0,
  TableArn: 'arn:test',
  TableId: 'x',
  hashKey: 'pk',
  sortKey: null,
}

function stubPutItem(capture: { body?: { TableName?: string; Item?: Record<string, unknown> } }) {
  mswServer.use(
    http.post('*/', async ({ request }) => {
      const target = request.headers.get('x-amz-target') ?? ''
      if (target !== 'DynamoDB_20120810.PutItem') return
      capture.body = (await request.json()) as {
        TableName?: string
        Item?: Record<string, unknown>
      }
      return HttpResponse.json(
        {},
        { headers: { 'Content-Type': 'application/x-amz-json-1.0' } },
      )
    }),
  )
}

describe('PutItemModal [DDB-03 / D-03 toggle]', () => {
  test('default mode is form; switching to JSON seeds textarea', async () => {
    render(
      wrap(
        <PutItemModal
          visible
          tableDescription={tableDesc}
          onDismiss={() => {}}
          onSaved={() => {}}
          onFailed={() => {}}
        />,
      ),
    )
    // Segment Form selected → no Textarea rendered.
    expect(document.querySelector('textarea')).toBeNull()
    // Switch to JSON segment.
    fireEvent.click(screen.getByText('JSON'))
    await waitFor(() => {
      expect(document.querySelector('textarea')).toBeDefined()
    })
    // Textarea seeded with form values marshaled to JSON (form has pk row
    // default type S empty → seed contains `"pk": { "S": "" }` wire shape).
    const textarea = document.querySelector('textarea')!
    expect(textarea.value).toContain('"pk"')
    expect(textarea.value).toContain('"S"')
  })

  test('form submit sends wire-shape Item with N kept as string (Pitfall 7.2.1)', async () => {
    const capture: { body?: { TableName?: string; Item?: Record<string, unknown> } } = {}
    stubPutItem(capture)
    const onSaved = vi.fn()
    render(
      wrap(
        <PutItemModal
          visible
          tableDescription={tableDesc}
          initialItem={{ pk: { S: 'c-1' }, total: { N: '42' } }}
          onDismiss={() => {}}
          onSaved={onSaved}
          onFailed={() => {}}
        />,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(capture.body?.TableName).toBe('orders')
    const item = capture.body?.Item as Record<string, unknown>
    expect(item.pk).toEqual({ S: 'c-1' })
    // N is a STRING on the wire, not a number.
    expect(item.total).toEqual({ N: '42' })
  })

  test('JSON mode with invalid JSON disables Save', async () => {
    render(
      wrap(
        <PutItemModal
          visible
          tableDescription={tableDesc}
          onDismiss={() => {}}
          onSaved={() => {}}
          onFailed={() => {}}
        />,
      ),
    )
    fireEvent.click(screen.getByText('JSON'))
    await waitFor(() => {
      expect(document.querySelector('textarea')).toBeDefined()
    })
    const textarea = document.querySelector('textarea')!
    fireEvent.change(textarea, { target: { value: '{bogus' } })
    const saveBtn = screen.getByRole('button', { name: 'Save' })
    expect(saveBtn).toBeDisabled()
  })
})
