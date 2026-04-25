import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import { copy } from '../../../shared/copy'
import { useDeleteQueue } from '../api/useDeleteQueue'

type Props = {
  visible: boolean
  queueName: string
  queueUrl: string
  onDismiss: () => void
  onDeleted: (name: string) => void
  onFailed: (name: string, error: Error) => void
}

/**
 * DeleteQueueModal — type-to-confirm by queue name (Phase 3 pattern).
 */
export function DeleteQueueModal({
  visible,
  queueName,
  queueUrl,
  onDismiss,
  onDeleted,
  onFailed,
}: Props) {
  const [confirm, setConfirm] = useState('')
  const mutation = useDeleteQueue()

  useEffect(() => {
    if (visible) {
      setConfirm('')
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!queueName) return null
  const canDelete = confirm === queueName && !mutation.isPending

  const handleSubmit = () => {
    if (!canDelete) return
    mutation.mutate(queueUrl, {
      onSuccess: () => onDeleted(queueName),
      onError: (err) => onFailed(queueName, err as Error),
    })
  }

  return (
    <Modal
      visible={visible}
      header={copy.sqs.deleteHeader(queueName)}
      size="medium"
      onDismiss={() => !mutation.isPending && onDismiss()}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="link"
              onClick={onDismiss}
              disabled={mutation.isPending}
            >
              {copy.sqs.cancelButton}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canDelete}
              loading={mutation.isPending}
            >
              {copy.sqs.deleteButton}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Alert type="warning">{copy.sqs.deleteBody(queueName)}</Alert>
        <FormField label={copy.sqs.deleteConfirmPrompt(queueName)}>
          <Input
            value={confirm}
            onChange={({ detail }) => setConfirm(detail.value)}
            placeholder={queueName}
            disabled={mutation.isPending}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  )
}
