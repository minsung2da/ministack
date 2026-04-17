import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Flashbar from '@cloudscape-design/components/flashbar'
import { UploadFlashItem } from './UploadFlashItem'
import type { UploadFlashItemState } from './UploadFlashItem'

function renderItem(
  state: UploadFlashItemState,
  {
    filename = 'a.txt',
    id = 'u1',
    onDismiss = vi.fn(),
  }: { filename?: string; id?: string; onDismiss?: (id: string) => void } = {},
) {
  const msg = UploadFlashItem({
    id,
    filename,
    bucket: 'my-bucket',
    fullKey: filename,
    state,
    onDismiss,
  })
  return render(<Flashbar items={[msg]} />)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('UploadFlashItem [S3-03]', () => {
  test('renders queued state with queued header copy', () => {
    renderItem({ status: 'queued' }, { filename: 'hello.txt' })
    expect(screen.getByText(/Queued: hello.txt/)).toBeTruthy()
  })

  test('renders in-progress state with ProgressBar + percent', () => {
    renderItem(
      {
        status: 'in-progress',
        bytesUploaded: 500,
        total: 1000,
        cancel: vi.fn(),
      },
      { filename: 'file.bin' },
    )
    expect(screen.getByText(/Uploading: file.bin/)).toBeTruthy()
    // ProgressBar + aria-live node both render "50%" — use getAllByText
    expect(screen.getAllByText(/50%/).length).toBeGreaterThan(0)
  })

  test('cancel button invokes state.cancel', () => {
    const cancel = vi.fn()
    renderItem({
      status: 'in-progress',
      bytesUploaded: 100,
      total: 1000,
      cancel,
    })
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  test('success state renders uploaded header', () => {
    renderItem({ status: 'success' }, { filename: 'done.txt' })
    expect(screen.getByText(/Uploaded: done.txt/)).toBeTruthy()
  })

  test('failure state shows error message and Retry', () => {
    const retry = vi.fn()
    renderItem({ status: 'failure', error: 'Network error', retry })
    expect(screen.getByText(/Upload failed: a.txt/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  test('cancelled state renders cancelled header', () => {
    renderItem({ status: 'cancelled' }, { filename: 'x.txt' })
    expect(screen.getByText(/Upload cancelled: x.txt/)).toBeTruthy()
  })

  test('success auto-dismisses after 5 seconds', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    renderItem({ status: 'success' }, { id: 'done-1', onDismiss })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(onDismiss).toHaveBeenCalledWith('done-1')
  })
})
