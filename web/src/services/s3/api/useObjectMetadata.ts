import { useQuery } from '@tanstack/react-query'
import type { S3ObjectMetadata } from '../../../shared/types'
import { encodeS3Key, s3Head } from './s3Client'

const USER_META_PREFIX = 'x-amz-meta-'

/**
 * Query hook — HEAD /{bucket}/{key}. Reads standard headers (content-type,
 * content-length, etag, last-modified, storage-class) and strips the
 * `x-amz-meta-` prefix from user metadata entries (Pitfall 10).
 */
export function useObjectMetadata(bucket: string, key: string) {
  return useQuery<S3ObjectMetadata>({
    queryKey: ['s3', 'metadata', bucket, key] as const,
    enabled: Boolean(bucket && key),
    queryFn: async () => {
      const res = await s3Head(`/${bucket}/${encodeS3Key(key)}`)
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`)
      }
      const userMetadata: Record<string, string> = {}
      res.headers.forEach((value, name) => {
        if (name.toLowerCase().startsWith(USER_META_PREFIX)) {
          userMetadata[name.slice(USER_META_PREFIX.length)] = value
        }
      })
      const storageClass =
        res.headers.get('x-amz-storage-class') ?? undefined
      return {
        contentType:
          res.headers.get('content-type') ?? 'application/octet-stream',
        contentLength: Number(res.headers.get('content-length') ?? '0'),
        etag: res.headers.get('etag') ?? '',
        lastModified: res.headers.get('last-modified') ?? '',
        storageClass,
        userMetadata,
      }
    },
  })
}
