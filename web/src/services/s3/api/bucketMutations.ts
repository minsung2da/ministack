import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { s3Delete, s3Put } from './s3Client'
import { parseErrorXml } from './parseS3Xml'

/**
 * Mutation hook — `PUT /{name}` (CreateBucket). Invalidates the buckets
 * query on success so `useBuckets` refetches.
 */
export function useCreateBucket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => s3Put(`/${name}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['s3', 'buckets'] })
    },
  })
}

/**
 * Error thrown by `useDeleteBucket` when the server rejects the delete with
 * `BucketNotEmpty`. Callers can branch on `err.code === 'BucketNotEmpty'` to
 * show UI-SPEC §Delete Bucket Contract message.
 */
export class BucketNotEmptyError extends Error {
  code = 'BucketNotEmpty' as const
  constructor(message: string) {
    super(message)
    this.name = 'BucketNotEmptyError'
  }
}

/**
 * Mutation hook — `DELETE /{name}` (DeleteBucket). On `BucketNotEmpty` the
 * XML error body is parsed and re-thrown as `BucketNotEmptyError` (D-12,
 * UI-SPEC §Delete Bucket Contract). On success the buckets query is
 * invalidated.
 */
export function useDeleteBucket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      try {
        await s3Delete(`/${name}`)
      } catch (err) {
        if (err instanceof HTTPError && err.response) {
          let xml = ''
          try {
            xml = await err.response.clone().text()
          } catch {
            // ignore — fall through to original error
          }
          const parsed = xml ? parseErrorXml(xml) : null
          if (parsed?.code === 'BucketNotEmpty') {
            throw new BucketNotEmptyError(
              parsed.message || 'Bucket is not empty',
            )
          }
        }
        throw err
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['s3', 'buckets'] })
    },
  })
}
