import { parseXml } from '../../../shared/api/xml'
import type {
  ListObjectsResult,
  S3Bucket,
  S3ObjectEntry,
  S3Tag,
} from '../../../shared/types'

/**
 * Parses `ListAllMyBucketsResult` and returns the bucket list.
 */
export function parseBuckets(xml: string): S3Bucket[] {
  const doc = parseXml(xml)
  const buckets = doc.getElementsByTagName('Bucket')
  return Array.from(buckets).map((b) => ({
    name: b.getElementsByTagName('Name')[0]?.textContent ?? '',
    creationDate: b.getElementsByTagName('CreationDate')[0]?.textContent ?? '',
  }))
}

function folderBasename(prefix: string): string {
  const trimmed = prefix.replace(/\/$/, '')
  const idx = trimmed.lastIndexOf('/')
  return idx >= 0 ? trimmed.substring(idx + 1) : trimmed
}

function fileBasename(key: string): string {
  const idx = key.lastIndexOf('/')
  return idx >= 0 ? key.substring(idx + 1) : key
}

/**
 * Parses `ListBucketResult` (ListObjectsV2). Folders (CommonPrefixes) come
 * first in the entries array, then files (Contents). Extracts pagination
 * signals (isTruncated, nextContinuationToken) per D-03/Pitfall 4.
 */
export function parseObjects(xml: string): ListObjectsResult {
  const doc = parseXml(xml)

  const folders: S3ObjectEntry[] = Array.from(
    doc.getElementsByTagName('CommonPrefixes'),
  ).map((cp) => {
    const prefix = cp.getElementsByTagName('Prefix')[0]?.textContent ?? ''
    return {
      kind: 'folder',
      key: prefix,
      name: folderBasename(prefix),
    }
  })

  const files: S3ObjectEntry[] = Array.from(
    doc.getElementsByTagName('Contents'),
  ).map((c) => {
    const key = c.getElementsByTagName('Key')[0]?.textContent ?? ''
    return {
      kind: 'file',
      key,
      name: fileBasename(key),
      size: Number(c.getElementsByTagName('Size')[0]?.textContent ?? '0'),
      lastModified:
        c.getElementsByTagName('LastModified')[0]?.textContent ?? '',
      etag: c.getElementsByTagName('ETag')[0]?.textContent ?? '',
    }
  })

  const isTruncated =
    doc.getElementsByTagName('IsTruncated')[0]?.textContent === 'true'
  const nextContinuationToken =
    doc.getElementsByTagName('NextContinuationToken')[0]?.textContent ?? null
  const keyCount = Number(
    doc.getElementsByTagName('KeyCount')[0]?.textContent ?? '0',
  )

  return {
    entries: [...folders, ...files],
    isTruncated,
    nextContinuationToken,
    keyCount,
  }
}

/**
 * Parses `Tagging` XML and returns the tag set as `{ key, value }[]`.
 */
export function parseTagging(xml: string): S3Tag[] {
  const doc = parseXml(xml)
  const tagEls = doc.getElementsByTagName('Tag')
  return Array.from(tagEls).map((t) => ({
    key: t.getElementsByTagName('Key')[0]?.textContent ?? '',
    value: t.getElementsByTagName('Value')[0]?.textContent ?? '',
  }))
}

/**
 * Extracts the `Code` + `Message` fields from a `<Error>` response. Returns
 * null when the XML is not an error document (e.g. plain success XML).
 */
export function parseErrorXml(
  xml: string,
): { code: string; message: string } | null {
  const doc = parseXml(xml)
  const err = doc.getElementsByTagName('Error')[0]
  if (!err) return null
  const code = err.getElementsByTagName('Code')[0]?.textContent ?? ''
  const message = err.getElementsByTagName('Message')[0]?.textContent ?? ''
  if (!code && !message) return null
  return { code, message }
}
