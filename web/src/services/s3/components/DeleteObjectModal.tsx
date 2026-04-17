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
  useDeleteObject,
  useDeleteObjects,
  type BatchDeleteResult,
} from '../api/objectMutations'

type DeleteObjectModalProps = {
  visible: boolean
  bucket: string
  prefix: string
  keys: string[]
  onDismiss: () => void
  onDeleted: (result: BatchDeleteResult) => void
}

/**
 * Type-to-confirm object deletion — single or bulk.
 *
 * - Single mode (keys.length === 1): user must type the full object key
 *   verbatim. This is the highest-friction path because a mistaken single
 *   deletion can still cost real data.
 * - Bulk mode (keys.length > 1): user must type the literal string "delete".
 *   Lower friction because bulk workflows are already an explicit user choice.
 *
 * T-3-05-05 — type-to-confirm required; Delete button disabled until the
 * input matches and no mutation is in-flight.
 */
export function DeleteObjectModal({
  visible,
  bucket,
  prefix,
  keys,
  onDismiss,
  onDeleted,
}: DeleteObjectModalProps) {
  const [confirmValue, setConfirmValue] = useState('')
  const [busy, setBusy] = useState(false)

  const deleteOne = useDeleteObject(bucket, prefix)
  const deleteMany = useDeleteObjects(bucket, prefix)

  useEffect(() => {
    if (visible) {
      setConfirmValue('')
      setBusy(false)
    }
  }, [visible])

  if (keys.length === 0) return null

  const isBulk = keys.length > 1
  const singleKey = keys[0]
  const expected = isBulk ? 'delete' : singleKey
  const canDelete = confirmValue === expected && !busy

  const header = isBulk
    ? copy.s3.bulkDeleteObjectsHeader(keys.length)
    : copy.s3.deleteObjectHeader
  const body = isBulk
    ? copy.s3.bulkDeleteObjectsBody(keys.length)
    : copy.s3.deleteObjectBody(singleKey)
  const prompt = isBulk
    ? copy.s3.bulkDeleteObjectsConfirmPrompt
    : copy.s3.deleteObjectConfirmPrompt(singleKey)
  const cta = isBulk ? copy.s3.bulkDeleteObjectsCta : copy.s3.deleteObjectCta

  const handleDismiss = () => {
    if (busy) return
    setConfirmValue('')
    onDismiss()
  }

  const handleConfirm = async () => {
    if (!canDelete) return
    setBusy(true)
    try {
      if (isBulk) {
        const result = await deleteMany.mutateAsync(keys)
        onDeleted(result)
      } else {
        try {
          await deleteOne.mutateAsync(singleKey)
          onDeleted({ deleted: [singleKey], errors: [] })
        } catch (err) {
          onDeleted({
            deleted: [],
            errors: [
              {
                key: singleKey,
                code: 'DeleteError',
                message: err instanceof Error ? err.message : String(err),
              },
            ],
          })
        }
      }
    } finally {
      setBusy(false)
      setConfirmValue('')
    }
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
            <Button variant="link" onClick={handleDismiss} disabled={busy}>
              Cancel
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
        <FormField label={prompt}>
          <Input
            value={confirmValue}
            onChange={({ detail }) => setConfirmValue(detail.value)}
            placeholder={
              isBulk ? 'Type "delete" to confirm' : `Type "${singleKey}" to confirm`
            }
            disabled={busy}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  )
}
