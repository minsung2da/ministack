import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import { useDeleteItem } from '../api/useDeleteItem'
import { renderAttributeValue } from '../api/attributeValue'
import { copy } from '../../../shared/copy'
import type {
  DdbItem,
  DdbTableDescription,
} from '../../../shared/types/ddb'

type TableDescriptionWithKeys = DdbTableDescription & {
  hashKey: string | null
  sortKey: string | null
}

type Props = {
  visible: boolean
  tableDescription: TableDescriptionWithKeys
  itemKey: DdbItem
  onDismiss: () => void
  onDeleted: () => void
  onFailed: (msg: string) => void
}

/**
 * Compose the type-to-confirm target string from the primary key values
 * (mirrors Phase 3/4 DeleteModal pattern adapted for compound DDB keys).
 */
function computeKeyString(itemKey: DdbItem): string {
  return Object.values(itemKey).map(renderAttributeValue).join('#')
}

/**
 * DeleteItemModal [DDB-03] — type-to-confirm by compound primary-key value.
 */
export function DeleteItemModal({
  visible,
  tableDescription,
  itemKey,
  onDismiss,
  onDeleted,
  onFailed,
}: Props) {
  const [confirm, setConfirm] = useState('')
  const mutation = useDeleteItem(tableDescription.TableName)

  useEffect(() => {
    if (visible) {
      setConfirm('')
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const keyString = computeKeyString(itemKey)
  const canDelete = confirm === keyString && !mutation.isPending

  const handleDismiss = () => {
    if (mutation.isPending) return
    onDismiss()
  }

  const handleSubmit = () => {
    if (!canDelete) return
    mutation.mutate(
      { key: itemKey },
      {
        onSuccess: () => onDeleted(),
        onError: (e) => onFailed((e as Error).message),
      },
    )
  }

  return (
    <Modal
      visible={visible}
      header={copy.ddb.deleteItemHeader}
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
              {copy.ddb.deleteItemSubmit}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Alert type="warning">{copy.ddb.deleteItemBody(keyString)}</Alert>
        <FormField label={copy.ddb.deleteItemConfirmPrompt(keyString)}>
          <Input
            value={confirm}
            onChange={({ detail }) => setConfirm(detail.value)}
            placeholder={keyString}
            disabled={mutation.isPending}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  )
}
