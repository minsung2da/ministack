import { useQuery } from '@tanstack/react-query'
import type { ListObjectsResult } from '../../../shared/types'
import { s3Get } from './s3Client'
import { parseObjects } from './parseS3Xml'

export type UseObjectsParams = {
  bucket: string
  prefix: string
  pageSize: number
  continuationToken: string | null
}

/**
 * Partial query key builder — scoped by (bucket, prefix). Used by mutation
 * hooks (`useDeleteObject`, `useDeleteObjects`) to invalidate only the
 * currently-viewed prefix. Page-size and continuation-token are intentionally
 * omitted so that mutations invalidate every page under the prefix.
 */
export const objectsQueryKey = (bucket: string, prefix: string) =>
  ['s3', 'objects', bucket, prefix] as const

/**
 * Query hook — fetches one page of ListObjectsV2.
 *
 * Behaviour:
 * - Always sends `list-type=2`, `delimiter=/`, `max-keys=<pageSize>`.
 * - Sends `prefix` only when non-empty (S3 treats empty prefix as root).
 * - Sends `continuation-token` only when non-null.
 * - `placeholderData: (prev) => prev` keeps the previous page visible while
 *   a new page is fetched (UI-SPEC §"Object list paging").
 * - Disabled when `bucket` is empty.
 */
export function useObjects(p: UseObjectsParams) {
  return useQuery<ListObjectsResult>({
    queryKey: [
      's3',
      'objects',
      p.bucket,
      p.prefix,
      p.pageSize,
      p.continuationToken ?? null,
    ] as const,
    queryFn: async () => {
      const searchParams: Record<string, string> = {
        'list-type': '2',
        'max-keys': String(p.pageSize),
        delimiter: '/',
      }
      if (p.prefix) searchParams.prefix = p.prefix
      if (p.continuationToken) {
        searchParams['continuation-token'] = p.continuationToken
      }
      return parseObjects(await s3Get(`/${p.bucket}`, searchParams))
    },
    placeholderData: (previous) => previous,
    enabled: Boolean(p.bucket),
  })
}
