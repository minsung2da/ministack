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
import { DeleteObjectModal } from './DeleteObjectModal'

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

describe('DeleteObjectModal [S3-03]', () => {
  test('single delete requires exact full key match', () => {
    render(
      wrap(
        <DeleteObjectModal
          visible
          bucket="my-bucket"
          prefix=""
          keys={['photos/cat.jpg']}
          onDismiss={() => {}}
          onDeleted={() => {}}
        />,
      ),
    )
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    expect(deleteBtn).toBeDisabled()

    const input = screen.getByPlaceholderText(
      'Type "photos/cat.jpg" to confirm',
    )
    fireEvent.change(input, { target: { value: 'photos/cat' } })
    expect(deleteBtn).toBeDisabled()

    fireEvent.change(input, { target: { value: 'photos/cat.jpg' } })
    expect(deleteBtn).not.toBeDisabled()
  })

  test('bulk delete requires string "delete"', () => {
    render(
      wrap(
        <DeleteObjectModal
          visible
          bucket="my-bucket"
          prefix=""
          keys={['a.txt', 'b.txt']}
          onDismiss={() => {}}
          onDeleted={() => {}}
        />,
      ),
    )
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    expect(deleteBtn).toBeDisabled()

    const input = screen.getByPlaceholderText('Type "delete" to confirm')
    fireEvent.change(input, { target: { value: 'del' } })
    expect(deleteBtn).toBeDisabled()

    fireEvent.change(input, { target: { value: 'delete' } })
    expect(deleteBtn).not.toBeDisabled()
  })

  test('single delete invokes onDeleted with {deleted:[key], errors:[]} on success', async () => {
    mswServer.use(...s3Handlers)
    const onDeleted = vi.fn()
    render(
      wrap(
        <DeleteObjectModal
          visible
          bucket="my-bucket"
          prefix=""
          keys={['hello.txt']}
          onDismiss={() => {}}
          onDeleted={onDeleted}
        />,
      ),
    )
    const input = screen.getByPlaceholderText('Type "hello.txt" to confirm')
    fireEvent.change(input, { target: { value: 'hello.txt' } })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    const arg = onDeleted.mock.calls[0][0]
    expect(arg.deleted).toEqual(['hello.txt'])
    expect(arg.errors).toEqual([])
  })

  test('bulk delete returns backend DeleteResult (deleted + errors)', async () => {
    mswServer.use(...s3Handlers)
    const onDeleted = vi.fn()
    render(
      wrap(
        <DeleteObjectModal
          visible
          bucket="my-bucket"
          prefix=""
          keys={['photos/cat.jpg', 'photos/dog.jpg']}
          onDismiss={() => {}}
          onDeleted={onDeleted}
        />,
      ),
    )
    fireEvent.change(screen.getByPlaceholderText('Type "delete" to confirm'), {
      target: { value: 'delete' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    const arg = onDeleted.mock.calls[0][0]
    // handler uses deleteObjectsSuccess fixture → 2 deleted, 0 errors
    expect(arg.deleted).toHaveLength(2)
    expect(arg.errors).toEqual([])
  })
})
