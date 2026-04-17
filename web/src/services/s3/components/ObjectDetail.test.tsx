import {
  describe,
  test,
  expect,
  vi,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { mswServer, http, HttpResponse } from '../../../test/msw'
import { s3Handlers } from '../__tests__/msw-handlers'
import { S3_FIXTURES } from '../__tests__/fixtures'
import { ObjectDetail } from './ObjectDetail'
import type { S3ObjectEntry } from '../../../shared/types'

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

const FILE_ENTRY: Extract<S3ObjectEntry, { kind: 'file' }> = {
  kind: 'file',
  key: 'photos/cat.jpg',
  name: 'cat.jpg',
  size: 1234567,
  lastModified: '2026-04-12T10:30:00Z',
  etag: '"abc123"',
}

describe('ObjectDetail [S3-04]', () => {
  test('renders Properties, Metadata, Tags tabs', async () => {
    mswServer.use(...s3Handlers)
    render(
      wrap(
        <ObjectDetail
          bucket="my-bucket"
          entry={FILE_ENTRY}
          onRequestDelete={() => {}}
        />,
      ),
    )
    expect(screen.getByText('Properties')).toBeTruthy()
    expect(screen.getByText('Metadata')).toBeTruthy()
    expect(screen.getByText('Tags')).toBeTruthy()
  })

  test('Metadata tab strips x-amz-meta- prefix from header keys (Pitfall 10)', async () => {
    mswServer.use(...s3Handlers)
    render(
      wrap(
        <ObjectDetail
          bucket="my-bucket"
          entry={FILE_ENTRY}
          onRequestDelete={() => {}}
        />,
      ),
    )
    // Open Metadata tab
    fireEvent.click(screen.getByText('Metadata'))
    // `x-amz-meta-author: alice` in fixture → tab shows `author`/`alice`
    await waitFor(() => expect(screen.getByText('author')).toBeTruthy())
    expect(screen.getByText('alice')).toBeTruthy()
    // prefix has been stripped
    expect(screen.queryByText(/x-amz-meta-author/)).toBeNull()
  })

  test('Tags tab empty state matches copy.s3.tagsEmpty', async () => {
    // Override tagging endpoint FIRST (msw runs newer handlers before older
    // ones from `use()`), then provide the rest of the S3 handlers as fallback.
    mswServer.use(
      http.get('*/my-bucket/*', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.has('tagging')) {
          return HttpResponse.xml(S3_FIXTURES.taggingEmpty)
        }
        return undefined
      }),
      ...s3Handlers,
    )
    render(
      wrap(
        <ObjectDetail
          bucket="my-bucket"
          entry={FILE_ENTRY}
          onRequestDelete={() => {}}
        />,
      ),
    )
    fireEvent.click(screen.getByText('Tags'))
    await waitFor(() =>
      expect(screen.getByText('No tags on this object.')).toBeTruthy(),
    )
  })

  test('Delete button triggers onRequestDelete', () => {
    mswServer.use(...s3Handlers)
    const onRequestDelete = vi.fn()
    render(
      wrap(
        <ObjectDetail
          bucket="my-bucket"
          entry={FILE_ENTRY}
          onRequestDelete={onRequestDelete}
        />,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }))
    expect(onRequestDelete).toHaveBeenCalledTimes(1)
  })
})

