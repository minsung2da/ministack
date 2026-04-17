import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import Header from '@cloudscape-design/components/header'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Flashbar from '@cloudscape-design/components/flashbar'
import type { FlashbarProps } from '@cloudscape-design/components/flashbar'
import { useQueryClient } from '@tanstack/react-query'
import { useObjects, objectsQueryKey } from './api/useObjects'
import { uploadObject, type UploadHandle } from './api/uploadClient'
import { downloadObject } from './api/downloadClient'
import { useUiStore } from '../../stores/uiStore'
import { useSplitPanel } from '../../contexts/SplitPanelContext'
import { copy } from '../../shared/copy'
import { ObjectTable } from './components/ObjectTable'
import { PrefixBreadcrumb } from './components/PrefixBreadcrumb'
import { DropZone } from './components/DropZone'
import {
  UploadFlashItem,
  type UploadFlashItemState,
} from './components/UploadFlashItem'
import {
  DownloadFlashItem,
  type DownloadFlashItemState,
} from './components/DownloadFlashItem'
import { ObjectDetail } from './components/ObjectDetail'
import { DeleteObjectModal } from './components/DeleteObjectModal'
import type { S3ObjectEntry } from '../../shared/types'

type UploadItem = {
  id: string
  file: File
  key: string
  batchId: string
  handle: UploadHandle | null
  state: UploadFlashItemState
}

type DownloadItem = {
  id: string
  filename: string
  objectKey: string
  state: DownloadFlashItemState
}

type GeneralFlashItem = FlashbarProps.MessageDefinition

const UPLOAD_CONCURRENCY = 3
const MAX_VISIBLE_UPLOADS = 3

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Object browser for `/services/s3/:bucketName?prefix=…`.
 *
 * Wires S3-03 (upload/download) + S3-04 (object metadata) on top of the
 * Plan 04 navigation/table surface:
 *  - DropZone wraps the table and funnels dropped files into startUploads.
 *  - Hidden <input type="file" multiple /> backs the Upload button.
 *  - startUploads launches up to UPLOAD_CONCURRENCY (3) uploads concurrently,
 *    each tracked as an UploadFlashItem; when the batch reaches a terminal
 *    state and any succeeded, the prefix-scoped objects query is invalidated
 *    exactly ONCE (Pitfall 6).
 *  - Upload keys are `${prefix}${file.name}` — basename only (D-08); never
 *    webkitRelativePath (T-3-05-01).
 *  - File-row click opens SplitPanel with <ObjectDetail />.
 *  - Actions dropdown → Download (sequential per-file) / Delete (opens modal).
 *  - DeleteObjectModal handles single (from SplitPanel) and bulk (from Actions).
 */
export default function ObjectBrowserPage() {
  const { bucketName = '' } = useParams<{ bucketName: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const prefix = searchParams.get('prefix') ?? ''
  const pageSize = useUiStore((s) => s.s3ObjectPageSize)
  const { setPanel, closePanel } = useSplitPanel()
  const qc = useQueryClient()

  // Pagination state.
  const [tokens, setTokens] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [selected, setSelected] = useState<S3ObjectEntry[]>([])

  // Upload / download / general flash state.
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [flash, setFlash] = useState<GeneralFlashItem[]>([])
  const [deleteKeys, setDeleteKeys] = useState<string[] | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // Tracks batches that have already fired invalidateQueries (Pitfall 6).
  const invalidatedBatchesRef = useRef<Set<string>>(new Set())

  // Pitfall 3: reset pagination and selection when the prefix changes.
  useEffect(() => {
    setTokens([])
    setCurrentPage(0)
    setSelected([])
    closePanel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix])

  const currentToken =
    currentPage === 0 ? null : (tokens[currentPage - 1] ?? null)

  const { data, isLoading, error, refetch } = useObjects({
    bucket: bucketName,
    prefix,
    pageSize,
    continuationToken: currentToken,
  })

  const canNext = Boolean(data?.isTruncated)
  const canPrev = currentPage > 0

  const onNext = () => {
    if (data?.isTruncated && data.nextContinuationToken) {
      setTokens((prev) => {
        const trimmed = prev.slice(0, currentPage)
        return [...trimmed, data.nextContinuationToken as string]
      })
      setCurrentPage((p) => p + 1)
    }
  }
  const onPrev = () => {
    if (currentPage > 0) setCurrentPage((p) => p - 1)
  }

  const onFolderClick = (folderKey: string) => {
    setSearchParams({ prefix: folderKey })
  }

  const onParentClick = () => {
    const parts = prefix.replace(/\/$/, '').split('/').filter(Boolean)
    parts.pop()
    const next = parts.length ? parts.join('/') + '/' : ''
    if (next) setSearchParams({ prefix: next })
    else setSearchParams({})
  }

  const onBreadcrumbNavigate = (newPrefix: string) => {
    if (newPrefix) setSearchParams({ prefix: newPrefix })
    else setSearchParams({})
  }

  // --- Upload orchestration ----------------------------------------------

  const updateUploadState = useCallback(
    (id: string, state: UploadFlashItemState) => {
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, state } : u)),
      )
    },
    [],
  )

  const dismissUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id))
  }, [])

  const dismissDownload = useCallback((id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const dismissFlash = useCallback((id: string) => {
    setFlash((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const pushFlash = useCallback(
    (item: Omit<GeneralFlashItem, 'onDismiss' | 'dismissible' | 'dismissLabel'>) => {
      const id = item.id ?? genId('flash')
      const full: GeneralFlashItem = {
        ...item,
        id,
        dismissible: true,
        dismissLabel: 'Dismiss',
        onDismiss: () => dismissFlash(id),
      }
      setFlash((prev) => [...prev, full])
      if (item.type === 'success') {
        setTimeout(() => dismissFlash(id), 5000)
      }
    },
    [dismissFlash],
  )

  const finalizeBatchIfDone = useCallback(
    (batchId: string) => {
      setUploads((prev) => {
        const batch = prev.filter((u) => u.batchId === batchId)
        if (batch.length === 0) return prev
        const allTerminal = batch.every(
          (u) =>
            u.state.status === 'success' ||
            u.state.status === 'failure' ||
            u.state.status === 'cancelled',
        )
        if (!allTerminal) return prev
        const anySuccess = batch.some((u) => u.state.status === 'success')
        // Pitfall 6: invalidate the prefix-scoped objects query exactly ONCE
        // per batch, and only if at least one upload succeeded.
        if (anySuccess && !invalidatedBatchesRef.current.has(batchId)) {
          invalidatedBatchesRef.current.add(batchId)
          void qc.invalidateQueries({
            queryKey: objectsQueryKey(bucketName, prefix),
          })
        }
        return prev
      })
    },
    [bucketName, prefix, qc],
  )

  const startOneUpload = useCallback(
    (item: UploadItem): Promise<void> => {
      const handle = uploadObject({
        bucket: bucketName,
        key: item.key,
        file: item.file,
        onProgress: (p) => {
          updateUploadState(item.id, {
            status: 'in-progress',
            bytesUploaded: p.bytesUploaded,
            total: p.total,
            cancel: () => handle.cancel(),
          })
        },
      })
      // Seed in-progress state immediately so cancel works before progress.
      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? {
                ...u,
                handle,
                state: {
                  status: 'in-progress',
                  bytesUploaded: 0,
                  total: item.file.size,
                  cancel: () => handle.cancel(),
                },
              }
            : u,
        ),
      )
      return handle.promise
        .then(() => {
          updateUploadState(item.id, { status: 'success' })
        })
        .catch((err) => {
          const e = err as Error & { cancelled?: boolean }
          if (e && e.cancelled) {
            updateUploadState(item.id, { status: 'cancelled' })
          } else {
            const message = e instanceof Error ? e.message : String(err)
            updateUploadState(item.id, {
              status: 'failure',
              error: message,
              retry: () => {
                void startOneUpload(item)
              },
            })
          }
        })
        .finally(() => {
          finalizeBatchIfDone(item.batchId)
        })
    },
    [bucketName, updateUploadState, finalizeBatchIfDone],
  )

  const startUploads = useCallback(
    (files: File[]) => {
      if (!files.length || !bucketName) return
      const batchId = genId('batch')
      // D-08: basename only. NEVER webkitRelativePath (T-3-05-01).
      const newItems: UploadItem[] = files.map((file) => ({
        id: genId('u'),
        file,
        key: `${prefix}${file.name}`,
        batchId,
        handle: null,
        state: { status: 'queued' },
      }))

      setUploads((prev) => {
        // Cap the visible queue — drop oldest non-error items if we would
        // exceed MAX_VISIBLE_UPLOADS (UI-SPEC: 3 visible max).
        const merged = [...prev, ...newItems]
        if (merged.length <= MAX_VISIBLE_UPLOADS) return merged
        const terminalNonError = merged.findIndex(
          (u) =>
            u.state.status === 'success' || u.state.status === 'cancelled',
        )
        if (terminalNonError >= 0) {
          const copyArr = [...merged]
          copyArr.splice(terminalNonError, 1)
          return copyArr
        }
        return merged
      })

      // Concurrency-3 pool: `UPLOAD_CONCURRENCY` workers pull from the shared
      // `newItems` queue until it's drained. Each worker awaits its upload's
      // terminal transition (success | failure | cancelled) before pulling the
      // next item, so at any moment at most UPLOAD_CONCURRENCY are in flight.
      queueMicrotask(() => {
        let idx = 0
        const worker = async (): Promise<void> => {
          while (idx < newItems.length) {
            const item = newItems[idx++]
            await startOneUpload(item)
          }
        }
        const poolSize = Math.min(UPLOAD_CONCURRENCY, newItems.length)
        for (let i = 0; i < poolSize; i++) {
          void worker()
        }
      })
    },
    [bucketName, prefix, startOneUpload],
  )

  // --- Download orchestration --------------------------------------------

  const runDownloadsSequentially = useCallback(
    async (entries: Extract<S3ObjectEntry, { kind: 'file' }>[]) => {
      for (const entry of entries) {
        const id = genId('d')
        const item: DownloadItem = {
          id,
          filename: entry.name,
          objectKey: entry.key,
          state: { status: 'in-progress' },
        }
        setDownloads((prev) => [...prev, item])
        try {
          await downloadObject(bucketName, entry.key)
          setDownloads((prev) =>
            prev.map((d) =>
              d.id === id ? { ...d, state: { status: 'success' } } : d,
            ),
          )
          setTimeout(() => dismissDownload(id), 5000)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          setDownloads((prev) =>
            prev.map((d) =>
              d.id === id
                ? { ...d, state: { status: 'failure', error: message } }
                : d,
            ),
          )
        }
      }
    },
    [bucketName, dismissDownload],
  )

  const onDownloadSelected = useCallback(() => {
    const files = selected.filter(
      (s): s is Extract<S3ObjectEntry, { kind: 'file' }> => s.kind === 'file',
    )
    if (files.length === 0) return
    void runDownloadsSequentially(files)
  }, [selected, runDownloadsSequentially])

  // --- File-row click → SplitPanel ---------------------------------------

  const onFileClick = (entry: Extract<S3ObjectEntry, { kind: 'file' }>) => {
    setPanel(
      <ObjectDetail
        bucket={bucketName}
        entry={entry}
        onRequestDelete={() => setDeleteKeys([entry.key])}
      />,
      entry.name,
    )
  }

  // --- Upload button / hidden input --------------------------------------

  const triggerFilePicker = () => fileInputRef.current?.click()

  const handlePickedFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) startUploads(files)
    // Reset so picking the same file again re-fires change.
    e.target.value = ''
  }

  // --- Flashbar assembly -------------------------------------------------

  const uploadFlashItems = uploads.map((u) =>
    UploadFlashItem({
      id: u.id,
      filename: u.file.name,
      bucket: bucketName,
      fullKey: u.key,
      state: u.state,
      onDismiss: dismissUpload,
    }),
  )
  const downloadFlashItems = downloads.map((d) =>
    DownloadFlashItem({
      id: d.id,
      filename: d.filename,
      objectKey: d.objectKey,
      state: d.state,
      onDismiss: dismissDownload,
    }),
  )
  const allFlashItems: GeneralFlashItem[] = [
    ...flash,
    ...uploadFlashItems,
    ...downloadFlashItems,
  ]

  return (
    <SpaceBetween size="m">
      <Flashbar items={allFlashItems} />
      <Header
        variant="h1"
        actions={
          <CopyToClipboard
            textToCopy={bucketName}
            copyButtonText={copy.s3.copyBucketNameButton}
            copySuccessText="Copied"
            copyErrorText="Copy failed"
          />
        }
      >
        {copy.s3.objectBrowserHeading(bucketName)}
      </Header>
      <PrefixBreadcrumb
        bucketName={bucketName}
        prefix={prefix}
        onNavigate={onBreadcrumbNavigate}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handlePickedFiles}
        data-testid="s3-upload-file-input"
      />
      <DropZone
        onDrop={(files) => startUploads(files)}
        currentPrefix={prefix}
      >
        <ObjectTable
          bucket={bucketName}
          prefix={prefix}
          data={data}
          isLoading={isLoading}
          error={error as Error | null}
          selected={selected}
          onSelectionChange={setSelected}
          onFileClick={onFileClick}
          onFolderClick={onFolderClick}
          onParentClick={onParentClick}
          onRefresh={() => {
            void refetch()
          }}
          onUploadClick={triggerFilePicker}
          onDeleteSelected={() => {
            const keys = selected
              .filter((s) => s.kind === 'file')
              .map((s) => s.key)
            if (keys.length) setDeleteKeys(keys)
          }}
          onDownloadSelected={onDownloadSelected}
          pagination={{
            canPrev,
            canNext,
            onPrev,
            onNext,
            pageLabel: `Page ${currentPage + 1}`,
          }}
        />
      </DropZone>
      {deleteKeys && (
        <DeleteObjectModal
          visible
          bucket={bucketName}
          prefix={prefix}
          keys={deleteKeys}
          onDismiss={() => setDeleteKeys(null)}
          onDeleted={({ deleted, errors }) => {
            setDeleteKeys(null)
            setSelected([])
            if (deleted.length === 1) {
              pushFlash({
                type: 'success',
                content: copy.s3.deleteObjectSuccess(deleted[0]),
              })
            } else if (deleted.length > 1) {
              pushFlash({
                type: 'success',
                content: copy.s3.bulkDeleteObjectsSuccess(deleted.length),
              })
            }
            for (const err of errors) {
              pushFlash({
                type: 'error',
                content: copy.s3.deleteObjectFailure(err.key, err.message),
              })
            }
          }}
        />
      )}
    </SpaceBetween>
  )
}
