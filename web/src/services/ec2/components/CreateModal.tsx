import type { ReactNode } from 'react'
import Modal from '@cloudscape-design/components/modal'
import Form from '@cloudscape-design/components/form'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'

type CreateModalProps = {
  visible: boolean
  header: string
  onDismiss: () => void
  onSubmit: () => void
  loading?: boolean
  submitLabel?: string
  children: ReactNode
  error?: string
  size?: 'small' | 'medium'
}

export function CreateModal({
  visible,
  header,
  onDismiss,
  onSubmit,
  loading = false,
  submitLabel = 'Create',
  children,
  error,
  size = 'medium',
}: CreateModalProps) {
  return (
    <Modal
      visible={visible}
      header={header}
      onDismiss={onDismiss}
      size={size}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onSubmit}
              loading={loading}
              disabled={loading}
            >
              {submitLabel}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <Form>
        <SpaceBetween size="m">
          {error && <Alert type="error">{error}</Alert>}
          {children}
        </SpaceBetween>
      </Form>
    </Modal>
  )
}
