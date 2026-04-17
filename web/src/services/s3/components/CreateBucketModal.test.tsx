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
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { s3Handlers } from '../__tests__/msw-handlers'
import { CreateBucketModal } from './CreateBucketModal'

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

describe('CreateBucketModal [S3-01]', () => {
  test('disables submit until validation passes', async () => {
    render(
      wrap(
        <CreateBucketModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    // No name entered → length 0 → validationError set → submit disabled
    const submit = screen.getByRole('button', { name: 'Create bucket' })
    expect(submit).toBeDisabled()

    const input = screen.getByPlaceholderText('my-bucket-name')
    fireEvent.change(input, { target: { value: 'ab' } })
    expect(submit).toBeDisabled()

    fireEvent.change(input, { target: { value: 'valid-bucket-name' } })
    await waitFor(() => expect(submit).not.toBeDisabled())
  })

  test('surfaces server error inline as Alert', async () => {
    mswServer.use(
      http.put('*/broken-bucket', () => {
        return new HttpResponse(
          `<?xml version="1.0"?><Error><Code>InternalError</Code><Message>server exploded</Message></Error>`,
          { status: 500, headers: { 'Content-Type': 'application/xml' } },
        )
      }),
    )
    render(
      wrap(
        <CreateBucketModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    const input = screen.getByPlaceholderText('my-bucket-name')
    fireEvent.change(input, { target: { value: 'broken-bucket' } })
    const submit = screen.getByRole('button', { name: 'Create bucket' })
    await waitFor(() => expect(submit).not.toBeDisabled())
    fireEvent.click(submit)

    // Inline Alert renders the ky HTTPError message (Cloudscape Alert does
    // not expose role="alert"; assert on the visible error text instead).
    await waitFor(
      () => {
        expect(
          screen.getByText(/Request failed with status code 500/i),
        ).toBeTruthy()
      },
      { timeout: 3000 },
    )
  })

  test('invokes useCreateBucket on submit with entered name and calls onCreated', async () => {
    mswServer.use(...s3Handlers)
    const onCreated = vi.fn()
    const onDismiss = vi.fn()
    render(
      wrap(
        <CreateBucketModal
          visible
          onDismiss={onDismiss}
          onCreated={onCreated}
        />,
      ),
    )
    const input = screen.getByPlaceholderText('my-bucket-name')
    fireEvent.change(input, { target: { value: 'valid-name' } })
    const submit = screen.getByRole('button', { name: 'Create bucket' })
    await waitFor(() => expect(submit).not.toBeDisabled())
    fireEvent.click(submit)

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('valid-name'))
    expect(onDismiss).toHaveBeenCalled()
  })
})
