import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Textarea from '@cloudscape-design/components/textarea'
import Select from '@cloudscape-design/components/select'
import Button from '@cloudscape-design/components/button'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { copy } from '../../../shared/copy'
import { useSendMessage } from '../api/useSendMessage'
import type { SqsMessageAttribute } from '../../../shared/types/sqs'

type DataTypeOption = 'String' | 'Number' | 'Binary'
type AttrRow = {
  id: string
  name: string
  dataType: DataTypeOption
  stringValue: string
}

type Props = {
  visible: boolean
  queueUrl: string
  onDismiss: () => void
  onSent: () => void
  onFailed: (msg: string) => void
}

function newId(): string {
  return `attr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const DATA_TYPE_OPTIONS = [
  { value: 'String', label: 'String' },
  { value: 'Number', label: 'Number' },
  { value: 'Binary', label: 'Binary' },
]

/**
 * SendMessageModal — MessageBody + optional MessageAttributes rows.
 * D-10: MessageAttributes passes as nested JSON object — never query-encoded.
 */
export function SendMessageModal({
  visible,
  queueUrl,
  onDismiss,
  onSent,
  onFailed,
}: Props) {
  const [body, setBody] = useState('')
  const [rows, setRows] = useState<AttrRow[]>([])
  const mutation = useSendMessage(queueUrl)

  useEffect(() => {
    if (visible) {
      setBody('')
      setRows([])
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const canSubmit = body.length > 0 && !mutation.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    const valid = rows.filter((r) => r.name.trim() !== '')
    const MessageAttributes: Record<string, SqsMessageAttribute> | undefined =
      valid.length === 0
        ? undefined
        : Object.fromEntries(
            valid.map((r) => [
              r.name,
              { DataType: r.dataType, StringValue: r.stringValue },
            ]),
          )
    mutation.mutate(
      { MessageBody: body, MessageAttributes },
      {
        onSuccess: () => onSent(),
        onError: (err) => onFailed((err as Error).message),
      },
    )
  }

  return (
    <Modal
      visible={visible}
      header={copy.sqs.sendHeader}
      size="large"
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
              {copy.sqs.sendButton}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <FormField label={copy.sqs.messageBodyLabel}>
          <Textarea
            value={body}
            onChange={({ detail }) => setBody(detail.value)}
            rows={6}
            placeholder='{"hello":"world"}'
            disabled={mutation.isPending}
          />
        </FormField>

        <FormField label={copy.sqs.messageAttributesLabel}>
          <SpaceBetween size="xs">
            {rows.map((row, idx) => (
              <SpaceBetween key={row.id} direction="horizontal" size="xs">
                <Input
                  value={row.name}
                  placeholder="Name"
                  onChange={({ detail }) =>
                    setRows((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, name: detail.value } : r,
                      ),
                    )
                  }
                />
                <Select
                  selectedOption={{
                    value: row.dataType,
                    label: row.dataType,
                  }}
                  options={DATA_TYPE_OPTIONS}
                  onChange={({ detail }) =>
                    setRows((prev) =>
                      prev.map((r, i) =>
                        i === idx
                          ? {
                              ...r,
                              dataType:
                                (detail.selectedOption
                                  .value as DataTypeOption) ?? 'String',
                            }
                          : r,
                      ),
                    )
                  }
                />
                <Input
                  value={row.stringValue}
                  placeholder="Value"
                  onChange={({ detail }) =>
                    setRows((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, stringValue: detail.value } : r,
                      ),
                    )
                  }
                />
                <Button
                  variant="link"
                  onClick={() =>
                    setRows((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  Remove
                </Button>
              </SpaceBetween>
            ))}
            <Button
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  {
                    id: newId(),
                    name: '',
                    dataType: 'String',
                    stringValue: '',
                  },
                ])
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
