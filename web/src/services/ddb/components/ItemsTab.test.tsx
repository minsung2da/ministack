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
import type { ReactNode } from 'react'
import { http, HttpResponse } from 'msw'
import { mswServer } from '../../../test/msw'
import { SplitPanelProvider } from '../../../contexts/SplitPanelContext'
import { ItemsTab } from './ItemsTab'
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
  return (
    <QueryClientProvider client={client}>
      <SplitPanelProvider>{ui}</SplitPanelProvider>
    </QueryClientProvider>
  )
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
  ItemCount: 1,
  TableSizeBytes: 128,
  TableArn: 'arn:aws:dynamodb:us-east-1:000000000000:table/orders',
  TableId: 'abc',
  hashKey: 'pk',
  sortKey: null,
}

type ScanCapture = {
  calls: Array<{ FilterExpression?: string; ExclusiveStartKey?: unknown }>
}

function stubScan(
  capture: ScanCapture,
  pages: Array<Record<string, unknown>>,
) {
  let callIdx = 0
  mswServer.use(
    http.post('*/', async ({ request }) => {
      const target = request.headers.get('x-amz-target') ?? ''
      if (target !== 'DynamoDB_20120810.Scan') return
      const body = (await request.json()) as {
        FilterExpression?: string
        ExclusiveStartKey?: unknown
      }
      capture.calls.push({
        FilterExpression: body.FilterExpression,
        ExclusiveStartKey: body.ExclusiveStartKey,
      })
      const page = pages[callIdx] ?? pages[pages.length - 1]
      callIdx += 1
      return HttpResponse.json(page, {
        headers: { 'Content-Type': 'application/x-amz-json-1.0' },
      })
    }),
  )
}

describe('ItemsTab [DDB-02]', () => {
  test('dynamic columns: key attribute rendered with "(key)" label', async () => {
    stubScan({ calls: [] }, [
      { Items: [{ pk: { S: 'a' }, name: { S: 'n' } }], Count: 1, ScannedCount: 1 },
    ])
    render(wrap(<ItemsTab tableDescription={tableDesc} />))
    // Wait for the scan row's value to render — means columns derived from the data are attached.
    await waitFor(() => {
      expect(screen.getByText('a')).toBeDefined()
    })
    // pk (key) column + name column
    expect(screen.getByRole('columnheader', { name: 'pk (key)' })).toBeDefined()
    const colHeaders = screen.getAllByRole('columnheader')
    expect(colHeaders.length).toBeGreaterThanOrEqual(2)
    // At least one header contains "name" but not "(key)"
    const nameHeader = colHeaders.find(
      (h) =>
        (h.textContent ?? '').includes('name') &&
        !(h.textContent ?? '').includes('(key)'),
    )
    expect(nameHeader).toBeDefined()
  })

  test('Next click sends ExclusiveStartKey as a MAP (Pitfall 7.2.2)', async () => {
    const capture: ScanCapture = { calls: [] }
    stubScan(capture, [
      {
        Items: [{ pk: { S: 'a' } }],
        Count: 1,
        ScannedCount: 1,
        LastEvaluatedKey: { pk: { S: 'a' } },
      },
      { Items: [], Count: 0, ScannedCount: 0 },
    ])
    render(wrap(<ItemsTab tableDescription={tableDesc} />))
    await waitFor(() => expect(capture.calls.length).toBeGreaterThan(0))
    // Initial call — no ESK
    expect(capture.calls[0].ExclusiveStartKey).toBeUndefined()

    const nextBtn = await screen.findByRole('button', { name: 'Next' })
    fireEvent.click(nextBtn)
    await waitFor(() => expect(capture.calls.length).toBe(2))
    // Second call — ESK is a MAP (object), not a string
    const esk = capture.calls[1].ExclusiveStartKey
    expect(esk).toBeDefined()
    expect(typeof esk).toBe('object')
    expect((esk as { pk: { S: string } }).pk).toEqual({ S: 'a' })
  })

  test('filter change resets LEK stack (Pitfall 7.2.2)', async () => {
    const capture: ScanCapture = { calls: [] }
    stubScan(capture, [
      {
        Items: [{ pk: { S: 'a' } }],
        Count: 1,
        ScannedCount: 1,
        LastEvaluatedKey: { pk: { S: 'a' } },
      },
      {
        Items: [{ pk: { S: 'b' } }],
        Count: 1,
        ScannedCount: 1,
        LastEvaluatedKey: { pk: { S: 'b' } },
      },
      { Items: [], Count: 0, ScannedCount: 0 },
    ])
    render(wrap(<ItemsTab tableDescription={tableDesc} />))
    await waitFor(() => expect(capture.calls.length).toBeGreaterThan(0))
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }))
    await waitFor(() => expect(capture.calls.length).toBe(2))
    expect(capture.calls[1].ExclusiveStartKey).toBeDefined()

    // Set filter → Run scan; stack MUST be reset (no ESK in new call).
    const filterInput = screen.getByPlaceholderText('attribute_exists(pk)')
    fireEvent.change(filterInput, { target: { value: 'contains(name, "x")' } })
    fireEvent.click(screen.getByRole('button', { name: 'Run scan' }))
    await waitFor(() => expect(capture.calls.length).toBe(3))
    expect(capture.calls[2].FilterExpression).toBe('contains(name, "x")')
    expect(capture.calls[2].ExclusiveStartKey).toBeUndefined()
  })
})
