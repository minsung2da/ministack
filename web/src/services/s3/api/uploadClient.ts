import { AUTHORIZATION, encodeS3Key } from './s3Client'

export type UploadProgress = {
  bytesUploaded: number
  total: number
}

export type UploadHandle = {
  promise: Promise<void>
  cancel: () => void
}

export type UploadParams = {
  bucket: string
  key: string
  file: File
  onProgress?: (progress: UploadProgress) => void
}

/**
 * Upload a single File via PUT using raw XMLHttpRequest so we can surface
 * upload progress events (fetch upload progress is not yet reliable across
 * Safari/Firefox).
 *
 * Returns a handle with a `promise` that resolves on 2xx, rejects on non-2xx
 * with the status code and response text, rejects with `Network error` on
 * transport failure, and rejects with `{ cancelled: true }` when `cancel()`
 * is invoked.
 */
export function uploadObject(params: UploadParams): UploadHandle {
  const xhr = new XMLHttpRequest()

  const promise = new Promise<void>((resolve, reject) => {
    xhr.upload.addEventListener('progress', (ev) => {
      if (ev.lengthComputable && params.onProgress) {
        params.onProgress({ bytesUploaded: ev.loaded, total: ev.total })
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(
          new Error(`${xhr.status}: ${xhr.responseText || xhr.statusText}`),
        )
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      const err = new Error('Upload cancelled') as Error & { cancelled: true }
      ;(err as { cancelled: true }).cancelled = true
      reject(err)
    })

    xhr.open('PUT', `/${params.bucket}/${encodeS3Key(params.key)}`)
    xhr.setRequestHeader('Authorization', AUTHORIZATION)
    xhr.setRequestHeader(
      'Content-Type',
      params.file.type || 'application/octet-stream',
    )
    xhr.send(params.file)
  })

  return { promise, cancel: () => xhr.abort() }
}

export type BatchItem = UploadParams & { id: string }

export type BatchResult =
  | { id: string; status: 'success' }
  | { id: string; status: 'failure'; error: Error }
  | { id: string; status: 'cancelled' }

/**
 * Runs at most `concurrency` (default 3) uploads concurrently. Each item's
 * `UploadHandle` is surfaced via `onItemStart` so the UI can cancel per-file.
 *
 * Never rejects — always resolves with one `BatchResult` per input item, in
 * the original input order.
 */
export async function uploadBatch(
  items: BatchItem[],
  onItemStart?: (id: string, handle: UploadHandle) => void,
  concurrency = 3,
): Promise<BatchResult[]> {
  const results: BatchResult[] = new Array(items.length)
  let next = 0

  async function worker(): Promise<void> {
    while (true) {
      const idx = next++
      if (idx >= items.length) return
      const item = items[idx]
      const handle = uploadObject(item)
      onItemStart?.(item.id, handle)
      try {
        await handle.promise
        results[idx] = { id: item.id, status: 'success' }
      } catch (err) {
        const e = err as Error & { cancelled?: boolean }
        if (e && e.cancelled) {
          results[idx] = { id: item.id, status: 'cancelled' }
        } else {
          results[idx] = {
            id: item.id,
            status: 'failure',
            error: e instanceof Error ? e : new Error(String(err)),
          }
        }
      }
    }
  }

  const workers: Promise<void>[] = []
  const poolSize = Math.min(concurrency, items.length)
  for (let i = 0; i < poolSize; i++) workers.push(worker())
  await Promise.all(workers)
  return results
}
