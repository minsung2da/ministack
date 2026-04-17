import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import Form from '@cloudscape-design/components/form'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import { copy } from '../../../shared/copy'
import { validateBucketName } from '../api/validateBucketName'
import { useCreateBucket } from '../api/bucketMutations'

type CreateBucketModalProps = {
  visible: boolean
  onDismiss: () => void
  onCreated: (name: string) => void
}

export function CreateBucketModal({
  visible,
  onDismiss,
  onCreated,
}: CreateBucketModalProps) {
  const [name, setName] = useState('')
  const [touched, setTouched] = useState(false)
  const mutation = useCreateBucket()

  // Reset form state when the modal is opened fresh.
  useEffect(() => {
    if (visible) {
      setName('')
      setTouched(false)
      mutation.reset()
    }
    // mutation is stable across renders from @tanstack/react-query; omit from deps
    // to avoid reset loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const validationError = validateBucketName(name)
  const showValidationError = touched ? validationError : null
  const serverError =
    mutation.isError && mutation.error instanceof Error
      ? mutation.error.message
      : null

  const handleDismiss = () => {
    mutation.reset()
    onDismiss()
  }

  const handleSubmit = () => {
    setTouched(true)
    if (validationError) return
    mutation.mutate(name, {
      onSuccess: () => {
        onCreated(name)
        handleDismiss()
      },
    })
  }

  const submitDisabled = validationError !== null || mutation.isPending

  return (
    <Modal
      visible={visible}
      header={copy.s3.createBucketHeader}
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
              {copy.s3.createBucketCancel}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={submitDisabled}
              loading={mutation.isPending}
            >
              {copy.s3.createBucketButton}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <Form>
        <SpaceBetween size="m">
          {serverError && <Alert type="error">{serverError}</Alert>}
          <FormField
            label={copy.s3.createBucketNameLabel}
            description={copy.s3.createBucketNameHelp}
            errorText={showValidationError ?? undefined}
          >
            <Input
              value={name}
              placeholder={copy.s3.createBucketNamePlaceholder}
              onChange={({ detail }) => setName(detail.value)}
              onBlur={() => setTouched(true)}
              disabled={mutation.isPending}
            />
          </FormField>
        </SpaceBetween>
      </Form>
    </Modal>
  )
}
