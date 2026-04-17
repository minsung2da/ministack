import ProgressBar from '@cloudscape-design/components/progress-bar'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Box from '@cloudscape-design/components/box'
import type { FlashbarProps } from '@cloudscape-design/components/flashbar'
import { copy } from '../../../shared/copy'

/**
 * One of five upload lifecycle states. The component is pure-presentational —
 * the parent drives transitions by swapping the `state` prop.
 *
 *   queued      → waiting for an available worker (no progress yet)
 *   in-progress → upload running; `bytesUploaded / total` drives ProgressBar
 *   success     → 2xx returned; Flashbar auto-dismisses after 5s
 *   failure     → non-2xx or network error; Retry link calls state.retry
 *   cancelled   → user aborted; no auto-dismiss (user chose to cancel)
 */
export type UploadFlashItemState =
  | { status: 'queued' }
  | {
      status: 'in-progress'
      bytesUploaded: number
      total: number
      cancel: () => void
    }
  | { status: 'success' }
  | { status: 'failure'; error: string; retry: () => void }
  | { status: 'cancelled' }

export type UploadFlashItemProps = {
  id: string
  filename: string
  bucket: string
  fullKey: string
  state: UploadFlashItemState
  onDismiss: (id: string) => void
}

function humanBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '-'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// Ensures the 5-second auto-dismiss timer for `success` states is scheduled
// at most once per upload id, even if the parent re-renders and calls this
// factory multiple times.
const AUTO_DISMISS_SCHEDULED = new Set<string>()

/**
 * Factory: returns a Cloudscape FlashbarProps.MessageDefinition for one
 * upload's current state. Intended to be composed into a `<Flashbar items={…}>`
 * list alongside other upload / download / general-purpose items.
 */
export function UploadFlashItem(
  props: UploadFlashItemProps,
): FlashbarProps.MessageDefinition {
  const { id, filename, state, onDismiss } = props

  switch (state.status) {
    case 'queued':
      return {
        id,
        type: 'info',
        header: copy.s3.uploadQueuedHeader(filename),
        content: copy.s3.uploadQueuedBody,
        dismissible: true,
        dismissLabel: 'Dismiss',
        onDismiss: () => onDismiss(id),
      }

    case 'in-progress': {
      const { bytesUploaded, total, cancel } = state
      const percent =
        total > 0 ? Math.min(100, Math.floor((bytesUploaded / total) * 100)) : 0
      // Throttle the aria-live announcement to every 10% per UI-SPEC.
      const ariaBucket = Math.floor(percent / 10) * 10
      return {
        id,
        type: 'in-progress',
        header: copy.s3.uploadInProgressHeader(filename),
        content: (
          <SpaceBetween size="xs">
            <ProgressBar
              value={percent}
              description={copy.s3.uploadInProgressBody(
                percent,
                humanBytes(bytesUploaded),
                humanBytes(total),
              )}
            />
            <Box aria-live="polite" aria-atomic="true" variant="small">
              {`${ariaBucket}%`}
            </Box>
          </SpaceBetween>
        ),
        action: (
          <Button onClick={cancel}>{copy.s3.uploadCancelButton}</Button>
        ),
        dismissible: false,
      }
    }

    case 'success': {
      if (!AUTO_DISMISS_SCHEDULED.has(id)) {
        AUTO_DISMISS_SCHEDULED.add(id)
        setTimeout(() => {
          AUTO_DISMISS_SCHEDULED.delete(id)
          onDismiss(id)
        }, 5000)
      }
      return {
        id,
        type: 'success',
        header: copy.s3.uploadSuccessHeader(filename),
        content: copy.s3.uploadSuccessBody(props.bucket, props.fullKey),
        dismissible: true,
        dismissLabel: 'Dismiss',
        onDismiss: () => onDismiss(id),
      }
    }

    case 'failure':
      return {
        id,
        type: 'error',
        header: copy.s3.uploadFailureHeader(filename),
        content: copy.s3.uploadFailureBody(state.error),
        action: (
          <Button onClick={state.retry}>{copy.s3.uploadRetryLink}</Button>
        ),
        dismissible: true,
        dismissLabel: 'Dismiss',
        onDismiss: () => onDismiss(id),
      }

    case 'cancelled':
      return {
        id,
        type: 'warning',
        header: copy.s3.uploadCancelledHeader(filename),
        content: copy.s3.uploadCancelledBody,
        dismissible: true,
        dismissLabel: 'Dismiss',
        onDismiss: () => onDismiss(id),
      }
  }
}
