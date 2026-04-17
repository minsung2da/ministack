import type { FlashbarProps } from '@cloudscape-design/components/flashbar'
import { copy } from '../../../shared/copy'

/**
 * Download lifecycle states. Download uses the `fetch → Blob → <a download>`
 * pattern (see downloadClient.ts) — browsers don't expose download progress,
 * so there's no `bytesReceived / total` tracking.
 */
export type DownloadFlashItemState =
  | { status: 'in-progress' }
  | { status: 'success' }
  | { status: 'failure'; error: string }

export type DownloadFlashItemProps = {
  id: string
  filename: string
  objectKey: string
  state: DownloadFlashItemState
  onDismiss: (id: string) => void
}

const AUTO_DISMISS_SCHEDULED = new Set<string>()

export function DownloadFlashItem(
  props: DownloadFlashItemProps,
): FlashbarProps.MessageDefinition {
  const { id, filename, objectKey, state, onDismiss } = props

  switch (state.status) {
    case 'in-progress':
      return {
        id,
        type: 'in-progress',
        header: copy.s3.downloadInProgressHeader(filename),
        dismissible: false,
        loading: true,
      }

    case 'success':
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
        header: copy.s3.downloadSuccessHeader(filename),
        dismissible: true,
        dismissLabel: 'Dismiss',
        onDismiss: () => onDismiss(id),
      }

    case 'failure':
      return {
        id,
        type: 'error',
        header: copy.s3.downloadFailureHeader,
        content: copy.s3.downloadFailureBody(objectKey, state.error),
        dismissible: true,
        dismissLabel: 'Dismiss',
        onDismiss: () => onDismiss(id),
      }
  }
}
