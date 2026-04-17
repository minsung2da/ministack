import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import { copy } from '../../../shared/copy'
import {
  BucketNotEmptyError,
  useDeleteBucket,
} from '../api/bucketMutations'
import type { S3Bucket } from '../../../shared/types'

export type DeleteBucketResult = {
  deleted: string[]
  errors: { name: string; message: string; code?: string }[]
}

type DeleteBucketModalProps = {
  visible: boolean
  buckets: S3Bucket[]
  onDismiss: () => void
  onDeleted: (result: DeleteBucketResult) => void
}

export function DeleteBucketModal({
  visible,
  buckets,
  onDismiss,
  onDeleted,
}: DeleteBucketModalProps) {
  const [confirmValue, setConfirmValue] = useState('')
  const [busy, setBusy] = useState(false)
  const mutation = useDeleteBucket()

  useEffect(() => {
    if (visible) {
      setConfirmValue('')
      setBusy(false)
    }
  }, [visible])

  if (buckets.length === 0) {
    return null
  }

  const isBulk = buckets.length > 1
  const single = buckets[0]
  const expected = isBulk ? 'delete' : single.name
  const canDelete = confirmValue === expected && !busy

  const header = isBulk
    ? copy.s3.bulkDeleteBucketsHeader(buckets.length)
    : copy.s3.deleteBucketHeader
  const body = isBulk
    ? copy.s3.bulkDeleteBucketsBody(buckets.length)
    : copy.s3.deleteBucketBody(single.name)
  const confirmPrompt = isBulk
    ? copy.s3.bulkDeleteBucketsConfirmPrompt
    : copy.s3.deleteBucketConfirmPrompt(single.name)
  const cta = isBulk ? copy.s3.bulkDeleteBucketsCta : copy.s3.deleteBucketCta

  const handleDismiss = () => {
    if (busy) return
    setConfirmValue('')
    onDismiss()
  }

  const handleConfirm = async () => {
    if (!canDelete) return
    setBusy(true)
    const deleted: string[] = []
    const errors: DeleteBucketResult['errors'] = []
    // Sequential to keep behavior simple + to surface BucketNotEmpty per-bucket.
    for (const bucket of buckets) {
      try {
        await mutation.mutateAsync(bucket.name)
        deleted.push(bucket.name)
      } catch (err) {
        if (err instanceof BucketNotEmptyError) {
          errors.push({
            name: bucket.name,
            message: copy.s3.deleteBucketNotEmpty(bucket.name),
            code: 'BucketNotEmpty',
          })
        } else if (err instanceof Error) {
          errors.push({ name: bucket.name, message: err.message })
        } else {
          errors.push({ name: bucket.name, message: String(err) })
        }
      }
    }
    setBusy(false)
    setConfirmValue('')
    onDeleted({ deleted, errors })
  }

  return (
    <Modal
      visible={visible}
      header={header}
      size={isBulk ? 'medium' : 'small'}
      onDismiss={handleDismiss}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="link"
              onClick={handleDismiss}
              disabled={busy}
            >
              {copy.s3.deleteBucketCancel}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!canDelete}
              loading={busy}
            >
              {cta}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Alert type="warning">{body}</Alert>
        <FormField label={confirmPrompt}>
          <Input
            value={confirmValue}
            onChange={({ detail }) => setConfirmValue(detail.value)}
            placeholder={
              isBulk ? 'Type "delete" to confirm' : `Type "${single.name}" to confirm`
            }
            disabled={busy}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  )
}
