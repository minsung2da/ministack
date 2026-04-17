import { useQuery } from '@tanstack/react-query'
import type { S3Tag } from '../../../shared/types'
import { encodeS3Key, s3Get } from './s3Client'
import { parseTagging } from './parseS3Xml'

/**
 * Query hook — GET /{bucket}/{key}?tagging. Returns the object's tag set.
 * Disabled unless both bucket and key are truthy.
 */
export function useObjectTags(bucket: string, key: string) {
  return useQuery<S3Tag[]>({
    queryKey: ['s3', 'tags', bucket, key] as const,
    enabled: Boolean(bucket && key),
    queryFn: async () =>
      parseTagging(
        await s3Get(`/${bucket}/${encodeS3Key(key)}`, { tagging: '' }),
      ),
  })
}
