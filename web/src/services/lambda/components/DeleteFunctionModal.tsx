import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import { copy } from '../../../shared/copy'
import { useDeleteFunction } from '../api/functionMutations'

type DeleteFunctionModalProps = {
  visible: boolean
  functionName: string
  onDismiss: () => void
  onDeleted: (name: string) => void
  onFailed: (name: string, error: Error) => void
}

/**
 * DeleteFunctionModal — type-to-confirm exact function-name match.
 *
 * [Pitfall 9] No version-qualifier UI anywhere — the underlying
 * `useDeleteFunction` mutation has no code path that can attach a version
 * query param. $LATEST is implied.
 * [Plan 03-03 Rule 2] State resets on re-open via useEffect([visible]).
 */
export function DeleteFunctionModal({
  visible,
  functionName,
  onDismiss,
  onDeleted,
  onFailed,
}: DeleteFunctionModalProps) {
  const [confirm, setConfirm] = useState('')
  const mutation = useDeleteFunction()

  useEffect(() => {
    if (visible) {
      setConfirm('')
      mutation.reset()
    }
    // mutation is stable — omit from deps to avoid reset loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!functionName) return null

  const canDelete = confirm === functionName && !mutation.isPending

  const handleDismiss = () => {
    if (mutation.isPending) return
    onDismiss()
  }

  const handleSubmit = () => {
    if (!canDelete) return
    mutation.mutate(functionName, {
      onSuccess: () => onDeleted(functionName),
      onError: (err) => onFailed(functionName, err as Error),
    })
  }

  return (
    <Modal
      visible={visible}
      header={copy.lambda.deleteFunctionHeader(functionName)}
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
              {copy.lambda.cancelButton}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canDelete}
              loading={mutation.isPending}
            >
              {copy.lambda.deleteFunctionSubmit}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Alert type="warning">{copy.lambda.deleteFunctionBody(functionName)}</Alert>
        <FormField label={copy.lambda.deleteFunctionConfirmPrompt(functionName)}>
          <Input
            value={confirm}
            onChange={({ detail }) => setConfirm(detail.value)}
            placeholder={functionName}
            disabled={mutation.isPending}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  )
}
