import { useState, type ReactNode, type DragEvent } from 'react'
import { copy } from '../../../shared/copy'
import './DropZone.css'

/**
 * Drag-and-drop wrapper for the object browser.
 *
 * Uses a dragDepth counter (increment on dragEnter, decrement on dragLeave) to
 * guard against the Pitfall 2 child-to-child flicker: when the cursor crosses
 * from one nested child to another the browser fires a dragLeave on the
 * outgoing child and a dragEnter on the incoming one — with a simple boolean
 * the overlay would flash off then on. Counting events keeps the depth
 * positive until the cursor truly leaves the region.
 *
 * Security:
 *   - Only `dataTransfer.files` is read — never `getData('text/uri-list')` or
 *     any HTML payload (T-3-05-04).
 *   - `onDrop` only fires when at least one real File was present.
 */
type DropZoneProps = {
  onDrop: (files: File[]) => void
  disabled?: boolean
  currentPrefix: string
  children: ReactNode
}

export function DropZone({
  onDrop,
  disabled,
  currentPrefix,
  children,
}: DropZoneProps) {
  const [dragDepth, setDragDepth] = useState(0)
  const over = dragDepth > 0

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (disabled) return
    setDragDepth((d) => d + 1)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragDepth((d) => Math.max(0, d - 1))
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragDepth(0)
    if (disabled) return
    const files = Array.from(e.dataTransfer?.files ?? [])
    if (files.length > 0) onDrop(files)
  }

  const overlayText = currentPrefix
    ? copy.s3.dropZoneOverlayWithPrefix(currentPrefix)
    : copy.s3.dropZoneOverlayRoot

  return (
    <div
      role="region"
      aria-label={copy.s3.dropZoneAria}
      aria-live="polite"
      aria-atomic="true"
      data-drag-over={over ? 'true' : 'false'}
      className={over ? 's3-dropzone s3-dropzone--over' : 's3-dropzone'}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {over && (
        <div className="s3-dropzone__overlay" role="status">
          {overlayText}
        </div>
      )}
      {children}
    </div>
  )
}
