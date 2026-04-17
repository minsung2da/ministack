import { useQuery } from '@tanstack/react-query'
import type { S3Bucket } from '../../../shared/types'
import { s3Get } from './s3Client'
import { parseBuckets } from './parseS3Xml'

/**
 * Query hook — fetches the ListBuckets response and exposes `S3Bucket[]`.
 * Stable query key `['s3', 'buckets']` is shared with the create/delete
 * mutations in `bucketMutations.ts` for invalidation.
 */
export function useBuckets() {
  return useQuery<S3Bucket[]>({
    queryKey: ['s3', 'buckets'] as const,
    queryFn: async () => parseBuckets(await s3Get('/')),
  })
}
