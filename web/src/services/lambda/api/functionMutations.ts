import { useMutation, useQueryClient } from '@tanstack/react-query'
import { lambdaPost, lambdaPut, lambdaDelete } from './lambdaClient'
import { lambdaKeys } from './lambdaKeys'
import type {
  LambdaFunctionConfiguration,
  LambdaCodeSource,
} from '../../../shared/types'

export type CreateFunctionInput = {
  FunctionName: string
  Runtime: string
  Role: string
  Handler: string
  Description?: string
  Timeout?: number
  MemorySize?: number
  Environment?: { Variables: Record<string, string> }
  Architectures?: ('x86_64' | 'arm64')[]
  Code: LambdaCodeSource
}

/**
 * Build the CreateFunction POST body from a discriminated LambdaCodeSource.
 * Emits exactly the keys the backend expects for each variant (RESEARCH §
 * Backend REST Inventory item 2). ImageUri forces PackageType=Image.
 */
function buildCreateBody(input: CreateFunctionInput): Record<string, unknown> {
  const code = input.Code
  let Code: Record<string, string>
  let PackageType: 'Zip' | 'Image' = 'Zip'
  if (code.kind === 'zip') {
    Code = { ZipFile: code.ZipFile }
  } else if (code.kind === 's3') {
    Code = { S3Bucket: code.S3Bucket, S3Key: code.S3Key }
  } else {
    Code = { ImageUri: code.ImageUri }
    PackageType = 'Image'
  }
  const { Code: _omit, ...rest } = input
  void _omit
  return { ...rest, Code, PackageType }
}

/**
 * Mutation — POST /2015-03-31/functions (CreateFunction).
 *
 * On success invalidates `['lambda','functions']` only. Prefix-match covers
 * every `marker` value in the list-pagination cache. [Pitfall C-3]
 *
 * [LAM-01 / D-02]
 */
export function useCreateFunction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFunctionInput) =>
      lambdaPost<LambdaFunctionConfiguration>(
        '/2015-03-31/functions',
        buildCreateBody(input),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lambda', 'functions'] })
    },
  })
}

/**
 * Mutation — DELETE /2015-03-31/functions/{name} (DeleteFunction).
 *
 * [Pitfall 9] NEVER sends a Qualifier query param. `lambdaDelete` has no
 * searchParams parameter, so there is no code path that could attach one.
 *
 * On success: removes the cached detail for this function (stale after
 * deletion) AND invalidates the functions list. Single `invalidateQueries`
 * call per C-3.
 *
 * [LAM-01]
 */
export function useDeleteFunction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      lambdaDelete(`/2015-03-31/functions/${encodeURIComponent(name)}`),
    onSuccess: (_result, name) => {
      qc.removeQueries({ queryKey: lambdaKeys.function(name) })
      void qc.invalidateQueries({ queryKey: ['lambda', 'functions'] })
    },
  })
}

/**
 * Whitelisted keys for UpdateFunctionConfiguration (RESEARCH §item 5 —
 * matches backend `_update_config` enforcement at lambda_svc.py 842-860).
 * The TypeScript `Partial<...>` type gives compile-time guidance; the server
 * is the authoritative filter.
 */
const UPDATE_WHITELIST = [
  'Runtime',
  'Handler',
  'Description',
  'Timeout',
  'MemorySize',
  'Role',
  'Environment',
  'Layers',
  'TracingConfig',
  'DeadLetterConfig',
  'KMSKeyArn',
  'EphemeralStorage',
  'LoggingConfig',
  'VpcConfig',
  'Architectures',
  'FileSystemConfigs',
  'ImageConfig',
] as const

export type UpdateConfigurationInput = {
  name: string
  patch: Partial<Record<(typeof UPDATE_WHITELIST)[number], unknown>>
}

/**
 * Mutation — PUT /2015-03-31/functions/{name}/configuration
 * (UpdateFunctionConfiguration).
 *
 * On success invalidates ONLY `['lambda','function', name]`. The list
 * surface (runtime/handler/lastModified) is intentionally not invalidated —
 * it will pick up the new values on its next natural refetch. This is the
 * Pitfall C-3 "single invalidation per mutation" rule.
 *
 * [LAM-01]
 */
export function useUpdateConfiguration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, patch }: UpdateConfigurationInput) =>
      lambdaPut<LambdaFunctionConfiguration>(
        `/2015-03-31/functions/${encodeURIComponent(name)}/configuration`,
        patch,
      ),
    onSuccess: (_result, { name }) => {
      void qc.invalidateQueries({ queryKey: lambdaKeys.function(name) })
    },
  })
}
