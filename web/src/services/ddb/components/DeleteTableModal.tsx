import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import { copy } from '../../../shared/copy'
import { useDeleteTable } from '../api/useDeleteTable'

type Props = {
  visible: boolean
  tableName: string
  onDismiss: () => void
  onDeleted: (name: string) => void
  onFailed: (name: string, error: Error) => void
}

/**
 * DeleteTableModal — type-to-confirm exact table-name match. [DDB-01]
 * Mirrors DeleteFunctionModal (Phase 4).
 */
export function DeleteTableModal({
  visible,
  tableName,
  onDismiss,
  onDeleted,
  onFailed,
}: Props) {
  const [confirm, setConfirm] = useState('')
  const mutation = useDeleteTable()

  useEffect(() => {
    if (visible) {
      setConfirm('')
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!tableName) return null

  const canDelete = confirm === tableName && !mutation.isPending

  const handleDismiss = () => {
    if (mutation.isPending) return
    onDismiss()
  }

  const handleSubmit = () => {
    if (!canDelete) return
    mutation.mutate(tableName, {
      onSuccess: () => onDeleted(tableName),
      onError: (err) => onFailed(tableName, err as Error),
    })
  }

  return (
    <Modal
      visible={visible}
      header={copy.ddb.deleteTableHeader(tableName)}
      size="medium"
      onDismiss={handleDismiss}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="link"
              onClick={handleDismiss}
              disabled={mutation.isPending}
            >
              {copy.ddb.cancelButton}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canDelete}
              loading={mutation.isPending}
            >
              {copy.ddb.deleteTableSubmit}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Alert type="warning">{copy.ddb.deleteTableBody(tableName)}</Alert>
        <FormField label={copy.ddb.deleteTableConfirmPrompt(tableName)}>
          <Input
            value={confirm}
            onChange={({ detail }) => setConfirm(detail.value)}
            placeholder={tableName}
            disabled={mutation.isPending}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  )
}
