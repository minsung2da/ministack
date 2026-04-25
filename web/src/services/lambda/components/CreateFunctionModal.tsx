import { useEffect, useState } from 'react'
import Modal from '@cloudscape-design/components/modal'
import Form from '@cloudscape-design/components/form'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Select from '@cloudscape-design/components/select'
import Tiles from '@cloudscape-design/components/tiles'
import FileUpload from '@cloudscape-design/components/file-upload'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import { copy } from '../../../shared/copy'
import { useCreateFunction } from '../api/functionMutations'
import type { CreateFunctionInput } from '../api/functionMutations'
import { fileToBase64 } from '../api/codeUploadClient'
import type { LambdaCodeSource } from '../../../shared/types'

type Source = 'zip' | 's3' | 'image'

type CreateFunctionModalProps = {
  visible: boolean
  onDismiss: () => void
  onCreated: (name: string) => void
  onFailed?: (message: string) => void
}

/**
 * Supported runtime options (standard AWS runtimes — the backend's
 * `_create_function` does not enforce the list, but these are the common
 * ones users will expect).
 */
const RUNTIMES = [
  'python3.9',
  'python3.10',
  'python3.11',
  'python3.12',
  'nodejs18.x',
  'nodejs20.x',
  'nodejs22.x',
  'java11',
  'java17',
  'java21',
  'go1.x',
  'dotnet6',
  'dotnet8',
  'ruby3.3',
  'provided.al2023',
] as const

const NAME_REGEX = /^[a-zA-Z0-9-_]{1,64}$/

/**
 * CreateFunctionModal — [LAM-01 / D-02]
 *
 * Cloudscape Tiles for the three code-source variants (zip preselected),
 * per-variant inputs, client-side validation, and backend-error surfacing
 * via inline Alert + parent Flashbar callback.
 *
 * [Plan 03-03 Rule 2] State resets on re-open via useEffect([visible]).
 * [Pitfall 5] accept=".zip" is advisory only — backend BadZipFile errors
 * are surfaced via the Alert and the parent's Flashbar.
 */
export function CreateFunctionModal({
  visible,
  onDismiss,
  onCreated,
  onFailed,
}: CreateFunctionModalProps) {
  const [name, setName] = useState('')
  const [runtime, setRuntime] = useState('python3.12')
  const [handler, setHandler] = useState('index.handler')
  const [role, setRole] = useState('arn:aws:iam::000000000000:role/lambda-role')
  const [memory, setMemory] = useState('128')
  const [timeoutVal, setTimeoutVal] = useState('3')
  const [source, setSource] = useState<Source>('zip')
  const [zipFile, setZipFile] = useState<File[]>([])
  const [s3Bucket, setS3Bucket] = useState('')
  const [s3Key, setS3Key] = useState('')
  const [imageUri, setImageUri] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [touched, setTouched] = useState(false)

  const mutation = useCreateFunction()

  // Reset every piece of state when the modal re-opens — learning from
  // Plan 03-03 Rule 2 deviation (stale values leaking between opens).
  useEffect(() => {
    if (visible) {
      setName('')
      setRuntime('python3.12')
      setHandler('index.handler')
      setRole('arn:aws:iam::000000000000:role/lambda-role')
      setMemory('128')
      setTimeoutVal('3')
      setSource('zip')
      setZipFile([])
      setS3Bucket('')
      setS3Key('')
      setImageUri('')
      setServerError(null)
      setSubmitting(false)
      setTouched(false)
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const nameError = !name
    ? null
    : NAME_REGEX.test(name)
      ? null
      : copy.lambda.createFunctionNameInvalid

  const sourceValid =
    source === 'zip'
      ? zipFile.length === 1
      : source === 's3'
        ? s3Bucket.length > 0 && s3Key.length > 0
        : imageUri.length > 0

  const isValid =
    name.length > 0 &&
    !nameError &&
    handler.length > 0 &&
    role.length > 0 &&
    memory.length > 0 &&
    timeoutVal.length > 0 &&
    sourceValid

  const handleDismiss = () => {
    if (submitting) return
    onDismiss()
  }

  const buildCode = async (): Promise<LambdaCodeSource> => {
    if (source === 'zip') {
      const file = zipFile[0]
      const ZipFile = await fileToBase64(file)
      return { kind: 'zip', ZipFile }
    }
    if (source === 's3') {
      return { kind: 's3', S3Bucket: s3Bucket, S3Key: s3Key }
    }
    return { kind: 'image', ImageUri: imageUri }
  }

  const handleSubmit = async () => {
    setTouched(true)
    if (!isValid) return
    setServerError(null)
    setSubmitting(true)
    try {
      const Code = await buildCode()
      const input: CreateFunctionInput = {
        FunctionName: name,
        Runtime: runtime,
        Handler: handler,
        Role: role,
        Timeout: Number(timeoutVal),
        MemorySize: Number(memory),
        Code,
      }
      mutation.mutate(input, {
        onSuccess: () => {
          setSubmitting(false)
          onCreated(name)
          onDismiss()
        },
        onError: (err) => {
          setSubmitting(false)
          const message = (err as Error).message
          setServerError(message)
          onFailed?.(message)
        },
      })
    } catch (err) {
      setSubmitting(false)
      const message = (err as Error).message
      setServerError(message)
      onFailed?.(message)
    }
  }

  const submitDisabled = !isValid || submitting

  return (
    <Modal
      visible={visible}
      header={copy.lambda.createFunctionHeader}
      size="large"
      onDismiss={handleDismiss}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleDismiss} disabled={submitting}>
              {copy.lambda.cancelButton}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={submitDisabled}
              loading={submitting}
            >
              {copy.lambda.createFunctionSubmit}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <Form>
        <SpaceBetween size="m">
          {serverError && <Alert type="error">{serverError}</Alert>}

          <FormField
            label={copy.lambda.createFunctionNameLabel}
            description={copy.lambda.createFunctionNameHelp}
            errorText={touched ? (nameError ?? undefined) : undefined}
          >
            <Input
              value={name}
              placeholder={copy.lambda.createFunctionNamePlaceholder}
              onChange={({ detail }) => setName(detail.value)}
              onBlur={() => setTouched(true)}
              disabled={submitting}
            />
          </FormField>

          <FormField label={copy.lambda.createFunctionRuntimeLabel}>
            <Select
              selectedOption={{ label: runtime, value: runtime }}
              options={RUNTIMES.map((r) => ({ label: r, value: r }))}
              onChange={({ detail }) =>
                setRuntime(detail.selectedOption?.value ?? runtime)
              }
              disabled={submitting}
            />
          </FormField>

          <FormField label={copy.lambda.createFunctionHandlerLabel}>
            <Input
              value={handler}
              onChange={({ detail }) => setHandler(detail.value)}
              disabled={submitting}
            />
          </FormField>

          <FormField label={copy.lambda.createFunctionRoleLabel}>
            <Input
              value={role}
              onChange={({ detail }) => setRole(detail.value)}
              disabled={submitting}
            />
          </FormField>

          <FormField label={copy.lambda.createFunctionMemoryLabel}>
            <Input
              type="number"
              value={memory}
              onChange={({ detail }) => setMemory(detail.value)}
              disabled={submitting}
            />
          </FormField>

          <FormField label={copy.lambda.createFunctionTimeoutLabel}>
            <Input
              type="number"
              value={timeoutVal}
              onChange={({ detail }) => setTimeoutVal(detail.value)}
              disabled={submitting}
            />
          </FormField>

          <FormField label={copy.lambda.createFunctionCodeSourceLabel}>
            <Tiles
              value={source}
              onChange={({ detail }) => setSource(detail.value as Source)}
              items={[
                {
                  value: 'zip',
                  label: copy.lambda.codeSourceZipLabel,
                  description: copy.lambda.codeSourceZipDescription,
                },
                {
                  value: 's3',
                  label: copy.lambda.codeSourceS3Label,
                  description: copy.lambda.codeSourceS3Description,
                },
                {
                  value: 'image',
                  label: copy.lambda.codeSourceImageLabel,
                  description: copy.lambda.codeSourceImageDescription,
                },
              ]}
            />
          </FormField>

          {source === 'zip' && (
            <FormField label={copy.lambda.codeSourceZipFileLabel}>
              <FileUpload
                value={zipFile}
                onChange={({ detail }) => setZipFile([...detail.value])}
                accept=".zip"
                multiple={false}
                i18nStrings={{
                  uploadButtonText: () => copy.lambda.codeSourceZipUploadButton,
                  dropzoneText: () => copy.lambda.codeSourceZipFileHint,
                  removeFileAriaLabel: (n: number) => `Remove file ${n + 1}`,
                  limitShowFewer: 'Show fewer',
                  limitShowMore: 'Show more',
                  errorIconAriaLabel: 'Error',
                }}
              />
            </FormField>
          )}

          {source === 's3' && (
            <SpaceBetween size="s">
              <FormField label={copy.lambda.codeSourceS3BucketLabel}>
                <Input
                  value={s3Bucket}
                  onChange={({ detail }) => setS3Bucket(detail.value)}
                  disabled={submitting}
                />
              </FormField>
              <FormField label={copy.lambda.codeSourceS3KeyLabel}>
                <Input
                  value={s3Key}
                  onChange={({ detail }) => setS3Key(detail.value)}
                  disabled={submitting}
                />
              </FormField>
            </SpaceBetween>
          )}

          {source === 'image' && (
            <FormField label={copy.lambda.codeSourceImageUriLabel}>
              <Input
                value={imageUri}
                onChange={({ detail }) => setImageUri(detail.value)}
                disabled={submitting}
              />
            </FormField>
          )}
        </SpaceBetween>
      </Form>
    </Modal>
  )
}
