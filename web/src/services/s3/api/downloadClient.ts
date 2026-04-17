import { AUTHORIZATION, encodeS3Key } from './s3Client'

/**
 * Fetches an object from S3 and triggers a browser download via synthetic
 * `<a download>` click. Cleans up the blob URL after 60s (Pitfall 7 — long
 * enough for the browser to complete the save even for large files).
 *
 * Throws when the server returns a non-2xx status.
 */
export async function downloadObject(
  bucket: string,
  key: string,
): Promise<void> {
  const url = `/${bucket}/${encodeS3Key(key)}`
  const res = await fetch(url, {
    headers: { Authorization: AUTHORIZATION },
  })
  if (!res.ok) {
    throw new Error(`${res.status}: ${res.statusText}`)
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = key.split('/').pop() || key
  document.body.appendChild(a)
  a.click()
  a.remove()

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}
