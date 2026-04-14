import { useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import Alert from '@cloudscape-design/components/alert'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Box from '@cloudscape-design/components/box'
import { copy } from '../../../shared/copy'

type DeleteModalProps = {
  visible: boolean
  resourceType: string
  resourceId: string
  onConfirm: () => void
  onDismiss: () => void
  loading?: boolean
  isBulk?: boolean
  bulkCount?: number
}

export function DeleteModal({
  visible,
  resourceType,
  resourceId,
  onConfirm,
  onDismiss,
  loading = false,
  isBulk = false,
  bulkCount = 0,
}: DeleteModalProps) {
  const [confirmValue, setConfirmValue] = useState('')

  const isInstance = resourceType.toLowerCase() === 'instance'
  const expectedSingle = resourceId
  const expectedBulk = isInstance ? 'terminate' : 'delete'
  const expected = isBulk ? expectedBulk : expectedSingle
  const isConfirmed = confirmValue === expected

  const header = isBulk
    ? isInstance
      ? copy.ec2BulkTerminateHeader(bulkCount)
      : copy.ec2BulkDeleteHeader(bulkCount, resourceType)
    : isInstance
      ? copy.ec2TerminateHeader
      : copy.ec2DeleteHeader(resourceType)

  const body = isBulk
    ? isInstance
      ? copy.ec2BulkTerminateBody(bulkCount)
      : copy.ec2BulkDeleteBody(bulkCount, resourceType)
    : isInstance
      ? copy.ec2TerminateBody(resourceId)
      : copy.ec2DeleteBody(resourceType, resourceId)

  const confirmPrompt = isBulk
    ? isInstance
      ? copy.ec2BulkTerminateConfirmPrompt
      : copy.ec2BulkDeleteConfirmPrompt
    : isInstance
      ? copy.ec2TerminateConfirmPrompt(resourceId)
      : copy.ec2DeleteConfirmPrompt(resourceId)

  const submitLabel = isInstance ? copy.ec2TerminateCta : 'Delete'

  const handleDismiss = () => {
    setConfirmValue('')
    onDismiss()
  }

  const handleConfirm = () => {
    if (!isConfirmed) return
    setConfirmValue('')
    onConfirm()
  }

  return (
    <Modal
      visible={visible}
      header={header}
      onDismiss={handleDismiss}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleDismiss} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!isConfirmed}
              loading={loading}
            >
              {submitLabel}
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
            placeholder={isBulk ? `Type "${expected}" to confirm` : `Type "${expectedSingle}" to confirm`}
            disabled={loading}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  )
}
