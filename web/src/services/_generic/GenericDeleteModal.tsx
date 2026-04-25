import { useEffect, useMemo, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import { useDescriptorMutation } from './hooks/useGenericMutation'
import { GenericDiffPreviewModal } from './GenericDiffPreviewModal'
import { copy } from '../../shared/copy'
import type { ServiceDescriptor } from './types'

type Props = {
  descriptor: ServiceDescriptor
  row: Record<string, unknown>
  visible: boolean
  onDismiss: () => void
  onSuccess: () => void
  onError: (msg: string) => void
}

/**
 * GenericDeleteModal — type-to-confirm + D-07 diff preview gate.
 */
export function GenericDeleteModal({
  descriptor,
  row,
  visible,
  onDismiss,
  onSuccess,
  onError,
}: Props) {
  const deleteSpec = descriptor.mutations?.delete
  const { preview, sendAsync, isPending } = useDescriptorMutation(
    descriptor.serviceKey,
    'delete',
  )
  const typeField = deleteSpec?.typeToConfirmField ?? descriptor.idField
  const expected =
    typeof row[typeField] === 'string' ? (row[typeField] as string) : ''
  const [typed, setTyped] = useState('')
  const [diffOpen, setDiffOpen] = useState(false)

  useEffect(() => {
    if (visible) {
      setTyped('')
      setDiffOpen(false)
    }
  }, [visible])

  // Delete body uses the expected id — Pitfall 7.2.6: same input passed to
  // both preview() and send() (see handleSend).
  const input = useMemo(
    () => ({ [typeField]: expected }),
    [typeField, expected],
  )

  if (!deleteSpec) return null

  const canReview = typed === expected && expected !== '' && !isPending

  let previewed:
    | {
        url: string
        headers: Record<string, string>
        body: string | undefined
        method?: string
      }
    | null = null
  try {
    previewed = preview(input)
  } catch (_e) {
    previewed = null
  }

  const handleSend = () => {
    sendAsync(input)
      .then(() => {
        setDiffOpen(false)
        onSuccess()
      })
      .catch((err: Error) => {
        setDiffOpen(false)
        onError(err.message)
      })
  }

  return (
    <>
      <Modal
        visible={visible && !diffOpen}
        header={`Delete ${descriptor.displayName}`}
        size="medium"
        onDismiss={() => !isPending && onDismiss()}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={onDismiss}
                disabled={isPending}
              >
                {copy.generic.cancelButton}
              </Button>
              <Button
                variant="primary"
                onClick={() => setDiffOpen(true)}
                disabled={!canReview}
              >
                {copy.generic.reviewButton}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="warning">
            Are you sure you want to delete {expected}? This action cannot be
            undone.
          </Alert>
          <FormField label={`To confirm, type ${typeField} "${expected}"`}>
            <Input
              value={typed}
              onChange={({ detail }) => setTyped(detail.value)}
              placeholder={expected}
            />
          </FormField>
        </SpaceBetween>
      </Modal>

      {previewed && (
        <GenericDiffPreviewModal
          visible={diffOpen}
          url={previewed.url}
          headers={previewed.headers}
          body={previewed.body}
          method={previewed.method}
          isPending={isPending}
          onDismiss={() => setDiffOpen(false)}
          onConfirm={handleSend}
        />
      )}
    </>
  )
}
