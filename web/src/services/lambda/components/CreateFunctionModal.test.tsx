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
import { LAMBDA_FIXTURES } from '../__tests__/fixtures'
import { CreateFunctionModal } from './CreateFunctionModal'

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

function typeInput(placeholder: string, value: string) {
  fireEvent.change(screen.getByPlaceholderText(placeholder), {
    target: { value },
  })
}

describe('CreateFunctionModal [LAM-01 / D-02]', () => {
  test('shows three code-source tiles with Zip preselected (D-02)', () => {
    render(
      wrap(
        <CreateFunctionModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    expect(screen.getByText('Upload .zip file')).toBeDefined()
    expect(screen.getByText('S3 bucket + key')).toBeDefined()
    expect(screen.getByText('Container image URI')).toBeDefined()
    // Zip preselected — the FileUpload label (Zip file) is visible by default
    expect(screen.getByText('Zip file')).toBeDefined()
  })

  test('switching to S3 tile shows S3 bucket + key inputs', () => {
    render(
      wrap(
        <CreateFunctionModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    const s3Radio = document.querySelector<HTMLInputElement>(
      'input[type="radio"][value="s3"]',
    )
    expect(s3Radio).toBeTruthy()
    fireEvent.click(s3Radio!)
    expect(screen.getByText('S3 bucket')).toBeDefined()
    expect(screen.getByText('S3 key')).toBeDefined()
  })

  test('function name validation rejects invalid input', async () => {
    render(
      wrap(
        <CreateFunctionModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    typeInput('my-function', '@@bad@@')
    const submit = screen.getByRole('button', { name: 'Create' })
    expect(submit).toBeDisabled()
    // Trigger blur to mark touched then the error should render
    fireEvent.blur(screen.getByPlaceholderText('my-function'))
    await waitFor(() =>
      expect(
        screen.getByText(
          /Function name must be 1–64 chars of letters, numbers, hyphens, underscores/i,
        ),
      ).toBeDefined(),
    )
  })

  test('submit with Zip source posts Code.ZipFile (base64)', async () => {
    let captured: unknown = null
    mswServer.use(
      http.post('*/2015-03-31/functions', async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json(LAMBDA_FIXTURES.createFunctionResponse, {
          status: 201,
        })
      }),
    )
    const onCreated = vi.fn()
    render(
      wrap(
        <CreateFunctionModal
          visible
          onDismiss={() => {}}
          onCreated={onCreated}
        />,
      ),
    )
    typeInput('my-function', 'valid-func')

    // Supply a minimal "zip" file
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'hello.zip', {
      type: 'application/zip',
    })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create' })).not.toBeDisabled(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('valid-func'))
    expect(captured).not.toBeNull()
    const Code = (captured as { Code: Record<string, string> }).Code
    expect(typeof Code.ZipFile).toBe('string')
    expect((Code.ZipFile ?? '').length).toBeGreaterThan(0)
    expect((captured as Record<string, string>).PackageType).toBe('Zip')
  })

  test('submit with S3 source posts Code.S3Bucket + Code.S3Key', async () => {
    let captured: unknown = null
    mswServer.use(
      http.post('*/2015-03-31/functions', async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json(LAMBDA_FIXTURES.createFunctionResponse, {
          status: 201,
        })
      }),
    )
    const onCreated = vi.fn()
    render(
      wrap(
        <CreateFunctionModal
          visible
          onDismiss={() => {}}
          onCreated={onCreated}
        />,
      ),
    )
    typeInput('my-function', 'from-s3')
    const s3Radio = document.querySelector<HTMLInputElement>(
      'input[type="radio"][value="s3"]',
    )
    fireEvent.click(s3Radio!)
    // Inputs don't have distinctive placeholders; grab by label
    const bucketField = screen.getByText('S3 bucket').closest('div')!
      .parentElement!
    const keyField = screen.getByText('S3 key').closest('div')!.parentElement!
    fireEvent.change(bucketField.querySelector('input')!, {
      target: { value: 'my-code-bucket' },
    })
    fireEvent.change(keyField.querySelector('input')!, {
      target: { value: 'builds/app.zip' },
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create' })).not.toBeDisabled(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(captured).not.toBeNull()
    const body = captured as { Code: Record<string, string>; PackageType: string }
    expect(body.Code.S3Bucket).toBe('my-code-bucket')
    expect(body.Code.S3Key).toBe('builds/app.zip')
    expect(body.PackageType).toBe('Zip')
  })

  test('submit with Image source posts Code.ImageUri and PackageType: Image', async () => {
    let captured: unknown = null
    mswServer.use(
      http.post('*/2015-03-31/functions', async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json(LAMBDA_FIXTURES.createFunctionResponse, {
          status: 201,
        })
      }),
    )
    const onCreated = vi.fn()
    render(
      wrap(
        <CreateFunctionModal
          visible
          onDismiss={() => {}}
          onCreated={onCreated}
        />,
      ),
    )
    typeInput('my-function', 'from-image')
    const imageRadio = document.querySelector<HTMLInputElement>(
      'input[type="radio"][value="image"]',
    )
    fireEvent.click(imageRadio!)
    const uriField = screen.getByText('Image URI').closest('div')!
      .parentElement!
    fireEvent.change(uriField.querySelector('input')!, {
      target: { value: 'public.ecr.aws/demo/hello:latest' },
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create' })).not.toBeDisabled(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(captured).not.toBeNull()
    const body = captured as { Code: Record<string, string>; PackageType: string }
    expect(body.Code.ImageUri).toBe('public.ecr.aws/demo/hello:latest')
    expect(body.PackageType).toBe('Image')
  })

  test('accept=".zip" is advisory — backend error surfaces inline (Pitfall 5)', async () => {
    mswServer.use(
      http.post('*/2015-03-31/functions', () => {
        return HttpResponse.json(
          {
            __type: 'InvalidParameterValueException',
            message: 'BadZipFile: File is not a zip file',
          },
          { status: 400 },
        )
      }),
    )
    render(
      wrap(
        <CreateFunctionModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    typeInput('my-function', 'bad-func')
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File([new Uint8Array([0xff])], 'bad.zip')
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create' })).not.toBeDisabled(),
    )
    const onFailed = vi.fn()
    // Re-render with onFailed so we can assert the flashbar-bound callback fires
    // when the backend rejects the .zip (Pitfall 5 — client-side accept=".zip"
    // is advisory only). The inline Alert inside the Modal is rendered once
    // setServerError runs; we just assert the error path is reached.
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => {
      // An error Alert has role='group' with data-analytics-alert='error'
      const alert = document.querySelector('[data-analytics-alert="error"]')
      expect(alert).not.toBeNull()
    })
    void onFailed
  })

  test('modal resets state on re-open (Plan 03-03 Rule 2)', () => {
    const { rerender } = render(
      wrap(
        <CreateFunctionModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    typeInput('my-function', 'stale-name')
    // Close modal
    rerender(
      wrap(
        <CreateFunctionModal
          visible={false}
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    // Reopen
    rerender(
      wrap(
        <CreateFunctionModal
          visible
          onDismiss={() => {}}
          onCreated={() => {}}
        />,
      ),
    )
    const nameInput = screen.getByPlaceholderText('my-function') as HTMLInputElement
    expect(nameInput.value).toBe('')
  })
})
