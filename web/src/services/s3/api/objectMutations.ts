import { useMutation, useQueryClient } from '@tanstack/react-query'
import { parseXml } from '../../../shared/api/xml'
import { encodeS3Key, s3Delete, s3PostDelete } from './s3Client'
import { objectsQueryKey } from './useObjects'

export type BatchDeleteError = {
  key: string
  code: string
  message: string
}

export type BatchDeleteResult = {
  deleted: string[]
  errors: BatchDeleteError[]
}

/**
 * Escapes the 3 XML entities that can break a body interpolation
 * (Pitfall — XML injection via object key). Quotes are not needed here
 * because keys are embedded as element text, not attribute values.
 */
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Builds the `<Delete>` document for the DeleteObjects batch endpoint. */
function buildDeleteXml(keys: string[]): string {
  const objects = keys
    .map((k) => `<Object><Key>${escapeXml(k)}</Key></Object>`)
    .join('')
  return `<Delete>${objects}<Quiet>false</Quiet></Delete>`
}

/** Parses the DeleteResult XML into deleted + errors lists. */
function parseDeleteResult(xml: string): BatchDeleteResult {
  const doc = parseXml(xml)
  const deleted = Array.from(doc.getElementsByTagName('Deleted')).map(
    (el) => el.getElementsByTagName('Key')[0]?.textContent ?? '',
  )
  const errors = Array.from(doc.getElementsByTagName('Error')).map((el) => ({
    key: el.getElementsByTagName('Key')[0]?.textContent ?? '',
    code: el.getElementsByTagName('Code')[0]?.textContent ?? '',
    message: el.getElementsByTagName('Message')[0]?.textContent ?? '',
  }))
  return { deleted, errors }
}

/**
 * Mutation hook — `DELETE /{bucket}/{key}` (single object). The key is
 * segment-encoded (Pitfall 1). On success the prefix-scoped objects query
 * is invalidated.
 */
export function useDeleteObject(bucket: string, prefix: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => s3Delete(`/${bucket}/${encodeS3Key(key)}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: objectsQueryKey(bucket, prefix) })
    },
  })
}

/**
 * Mutation hook — `POST /{bucket}?delete` (DeleteObjects batch). Builds the
 * `<Delete><Object><Key>…</Key></Object><Quiet>false</Quiet></Delete>` body
 * with per-key XML escaping, parses the mixed `Deleted`/`Error` response,
 * and invalidates the prefix-scoped objects query exactly once per batch
 * (Pitfall 6).
 */
export function useDeleteObjects(bucket: string, prefix: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (keys: string[]): Promise<BatchDeleteResult> => {
      const xml = await s3PostDelete(`/${bucket}`, buildDeleteXml(keys))
      return parseDeleteResult(xml)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: objectsQueryKey(bucket, prefix) })
    },
  })
}
