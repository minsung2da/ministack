import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { copy } from '../../../shared/copy'
import { useCreateQueue } from '../api/useCreateQueue'

type AttrRow = { id: string; k: string; v: string }

type Props = {
  visible: boolean
  onDismiss: () => void
  onCreated: (name: string) => void
  onFailed: (msg: string) => void
}

const NAME_RE = /^[a-zA-Z0-9_-]{1,80}$/

function newId(): string {
  return `attr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * CreateQueueModal — QueueName + optional Attributes rows.
 * Submit → useCreateQueue; D-10 JSON wire (Attributes object, not URLSearchParams).
 */
export function CreateQueueModal({
  visible,
  onDismiss,
  onCreated,
  onFailed,
}: Props) {
  const [name, setName] = useState('')
  const [attrs, setAttrs] = useState<AttrRow[]>([])
  const mutation = useCreateQueue()

  useEffect(() => {
    if (visible) {
      setName('')
      setAttrs([])
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const nameValid = NAME_RE.test(name)
  const canSubmit = nameValid && !mutation.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    const trimmed = attrs.filter((a) => a.k.trim() !== '')
    const Attributes =
      trimmed.length === 0
        ? undefined
        : Object.fromEntries(trimmed.map((a) => [a.k, a.v]))
    mutation.mutate(
      { QueueName: name, Attributes },
      {
        onSuccess: () => onCreated(name),
        onError: (err) => onFailed((err as Error).message),
      },
    )
  }

  return (
    <Modal
      visible={visible}
      header={copy.sqs.createHeader}
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
              disabled={!canSubmit}
              loading={mutation.isPending}
            >
              {copy.sqs.createButton}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <FormField
          label={copy.sqs.queueNameLabel}
          errorText={
            name && !nameValid ? copy.sqs.queueNameInvalid : undefined
          }
        >
          <Input
            value={name}
            onChange={({ detail }) => setName(detail.value)}
            placeholder="my-queue"
            disabled={mutation.isPending}
          />
        </FormField>

        <FormField
          label={copy.sqs.attributesLabel}
          description={copy.sqs.attributesDescription}
        >
          <SpaceBetween size="xs">
            {attrs.map((row, idx) => (
              <SpaceBetween key={row.id} direction="horizontal" size="xs">
                <Input
                  value={row.k}
                  placeholder="VisibilityTimeout"
                  onChange={({ detail }) =>
                    setAttrs((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, k: detail.value } : r,
                      ),
                    )
                  }
                />
                <Input
                  value={row.v}
                  placeholder="30"
                  onChange={({ detail }) =>
                    setAttrs((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, v: detail.value } : r,
                      ),
                    )
                  }
                />
                <Button
                  variant="link"
                  onClick={() =>
                    setAttrs((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  Remove
                </Button>
              </SpaceBetween>
            ))}
            <Button
              onClick={() =>
                setAttrs((prev) => [...prev, { id: newId(), k: '', v: '' }])
              }
            >
              {copy.sqs.addAttributeButton}
            </Button>
          </SpaceBetween>
        </FormField>
      </SpaceBetween>
    </Modal>
  )
}
