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
import { mswServer } from '../../../test/msw'
import { s3Handlers } from '../__tests__/msw-handlers'
import { DeleteBucketModal } from './DeleteBucketModal'
import type { S3Bucket } from '../../../shared/types'

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

const A: S3Bucket = { name: 'my-bucket', creationDate: '2026-04-12T10:30:00Z' }
const B: S3Bucket = {
  name: 'other-bucket',
  creationDate: '2026-04-15T08:12:00Z',
}

describe('DeleteBucketModal [S3-01]', () => {
  test('single-delete requires exact bucket-name match before enabling Delete', () => {
    render(
      wrap(
        <DeleteBucketModal
          visible
          buckets={[A]}
          onDismiss={() => {}}
          onDeleted={() => {}}
        />,
      ),
    )
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    expect(deleteBtn).toBeDisabled()

    const input = screen.getByPlaceholderText('Type "my-bucket" to confirm')
    fireEvent.change(input, { target: { value: 'my-buck' } })
    expect(deleteBtn).toBeDisabled()

    fireEvent.change(input, { target: { value: 'my-bucket' } })
    expect(deleteBtn).not.toBeDisabled()
  })

  test('bulk-delete requires exact string "delete" (lowercase)', () => {
    render(
      wrap(
        <DeleteBucketModal
          visible
          buckets={[A, B]}
          onDismiss={() => {}}
          onDeleted={() => {}}
        />,
      ),
    )
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    expect(deleteBtn).toBeDisabled()

    const input = screen.getByPlaceholderText('Type "delete" to confirm')
    fireEvent.change(input, { target: { value: 'DELETE' } })
    expect(deleteBtn).toBeDisabled()

    fireEvent.change(input, { target: { value: 'delete' } })
    expect(deleteBtn).not.toBeDisabled()
  })

  test('BucketNotEmpty error surfaces with UI-SPEC copy via onDeleted', async () => {
    mswServer.use(...s3Handlers)
    const onDeleted = vi.fn()
    const target: S3Bucket = {
      name: 'not-empty',
      creationDate: '2026-04-12T10:30:00Z',
    }
    render(
      wrap(
        <DeleteBucketModal
          visible
          buckets={[target]}
          onDismiss={() => {}}
          onDeleted={onDeleted}
        />,
      ),
    )
    const input = screen.getByPlaceholderText('Type "not-empty" to confirm')
    fireEvent.change(input, { target: { value: 'not-empty' } })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    const arg = onDeleted.mock.calls[0][0]
    expect(arg.deleted).toEqual([])
    expect(arg.errors).toHaveLength(1)
    expect(arg.errors[0].code).toBe('BucketNotEmpty')
    expect(arg.errors[0].message).toBe(
      'Cannot delete bucket not-empty: bucket is not empty. Delete all objects first.',
    )
  })
})
