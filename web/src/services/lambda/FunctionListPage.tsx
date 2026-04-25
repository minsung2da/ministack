import { useState } from 'react'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { useFunctions } from './api/useFunctions'
import { copy } from '../../shared/copy'
import { FunctionTable } from './components/FunctionTable'
import { CreateFunctionModal } from './components/CreateFunctionModal'
import { DeleteFunctionModal } from './components/DeleteFunctionModal'
import {
  useFlashNotifications,
  FlashNotifications,
} from '../ec2/components/FlashNotifications'
import type { LambdaFunctionSummary } from '../../shared/types'

/**
 * Lambda function list page [LAM-01].
 *
 * Owns marker pagination, flashbar notifications, and modal open/close
 * state for the create/delete flows. `FunctionTable` is a pure renderer
 * driven entirely by props.
 */
export default function FunctionListPage() {
  const [marker, setMarker] = useState<string | null>(null)
  const { data, isLoading, error, refetch } = useFunctions(marker)
  const functions = data?.Functions ?? []
  const nextMarker = data?.NextMarker ?? null

  const { items: flashItems, addSuccess, addError } = useFlashNotifications()

  const [selected, setSelected] = useState<LambdaFunctionSummary | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] =
    useState<LambdaFunctionSummary | null>(null)

  return (
    <SpaceBetween size="l">
      <FlashNotifications items={flashItems} />
      <Header variant="h1" description={copy.lambda.serviceDescription}>
        {copy.lambda.serviceHeading}
      </Header>
      <FunctionTable
        functions={functions}
        isLoading={isLoading}
        error={(error as Error | null) ?? null}
        marker={marker}
        nextMarker={nextMarker}
        selected={selected}
        onRefresh={() => void refetch()}
        onCreate={() => setCreateOpen(true)}
        onDelete={(fn) => setDeleteTarget(fn)}
        onMarkerChange={(m) => setMarker(m)}
        onSelectionChange={(fn) => setSelected(fn)}
      />
      <CreateFunctionModal
        visible={createOpen}
        onDismiss={() => setCreateOpen(false)}
        onCreated={(name) => addSuccess(copy.lambda.createFunctionSuccess(name))}
        onFailed={(message) =>
          addError(copy.lambda.createFunctionFailure(message))
        }
      />
      <DeleteFunctionModal
        visible={deleteTarget !== null}
        functionName={deleteTarget?.FunctionName ?? ''}
        onDismiss={() => setDeleteTarget(null)}
        onDeleted={(name) => {
          addSuccess(copy.lambda.deleteFunctionSuccess(name))
          setDeleteTarget(null)
          setSelected(null)
        }}
        onFailed={(name, e) => {
          addError(copy.lambda.deleteFunctionFailure(name, e.message))
          setDeleteTarget(null)
        }}
      />
    </SpaceBetween>
  )
}
