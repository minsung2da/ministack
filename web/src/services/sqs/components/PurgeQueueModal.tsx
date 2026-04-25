import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import { copy } from '../../../shared/copy'
import { usePurgeQueue } from '../api/usePurgeQueue'

type Props = {
  visible: boolean
  queueName: string
  queueUrl: string
  onDismiss: () => void
  onPurged: (name: string) => void
  onFailed: (name: string, error: Error) => void
}

/**
 * PurgeQueueModal — type-to-confirm by queue name.
 * Flashbar note: real AWS enforces 60s cooldown; MiniStack clears immediately.
 */
export function PurgeQueueModal({
  visible,
  queueName,
  queueUrl,
  onDismiss,
  onPurged,
  onFailed,
}: Props) {
  const [confirm, setConfirm] = useState('')
  const mutation = usePurgeQueue(queueUrl)

  useEffect(() => {
    if (visible) {
      setConfirm('')
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!queueName) return null
  const canPurge = confirm === queueName && !mutation.isPending

  const handleSubmit = () => {
    if (!canPurge) return
    mutation.mutate(undefined, {
      onSuccess: () => onPurged(queueName),
      onError: (err) => onFailed(queueName, err as Error),
    })
  }

  return (
    <Modal
      visible={visible}
      header={copy.sqs.purgeHeader(queueName)}
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
              disabled={!canPurge}
              loading={mutation.isPending}
            >
              {copy.sqs.purgeButton}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Alert type="warning">{copy.sqs.purgeConfirmCopy(queueName)}</Alert>
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
