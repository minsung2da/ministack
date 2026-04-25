import { useMutation, useQueryClient } from '@tanstack/react-query'
import { buildRequest, type BuildInput } from '../adapters/buildRequest'
import { awsJsonCall } from '../adapters/awsJson'
import { awsQueryCall } from '../adapters/awsQuery'
import { restCall } from '../adapters/rest'
import { GENERIC_DESCRIPTORS } from '../registry'
import { genericKeys } from '../keys'
import type { MutationSpec, ServiceDescriptor } from '../types'

/**
 * useDescriptorMutation — generic Create / Delete mutation with D-07 preview.
 *
 * Returns BOTH:
 *   - `preview(input)` — PURE; returns `buildRequest(spec, input)` verbatim.
 *     Used by the "Review request" modal so users see the exact payload
 *     before any HTTP fires.
 *   - `send(input)` — fires the mutation. Internally uses the SAME
 *     `specToBuildInput` helper so the outgoing body is byte-identical to
 *     what `preview()` returned (Pitfall 7.2.6).
 *
 * Pitfall C-3: onSuccess invalidates exactly one key — the list key.
 */

export class OperationNotSupportedError extends Error {
  constructor(serviceKey: string, op: string) {
    super(`Descriptor ${serviceKey} does not support op: ${op} (D-02)`)
    this.name = 'OperationNotSupportedError'
  }
}

function specToBuildInput(
  spec: MutationSpec,
  input: Record<string, unknown>,
): BuildInput {
  switch (spec.adapter) {
    case 'aws-json':
      return {
        adapter: 'aws-json',
        target: spec.target,
        credentialScope: spec.credentialScope,
        body: input,
      }
    case 'aws-query':
      return {
        adapter: 'aws-query',
        action: spec.action,
        version: spec.version,
        credentialScope: spec.credentialScope,
        params: Object.fromEntries(
          Object.entries(input).map(([k, v]) => [k, String(v)]),
        ),
      }
    case 'rest':
      return {
        adapter: 'rest',
        method: spec.method,
        path: spec.path,
        credentialScope: spec.credentialScope,
        body: input,
      }
  }
}

function specFor(
  descriptor: ServiceDescriptor | undefined,
  op: 'create' | 'delete',
): MutationSpec | null {
  if (!descriptor?.mutations) return null
  if (op === 'create') return descriptor.mutations.create ?? null
  if (op === 'delete') return descriptor.mutations.delete?.endpoint ?? null
  return null
}

export function useDescriptorMutation(
  serviceKey: string,
  op: 'create' | 'delete',
  registryOverride?: Record<string, ServiceDescriptor>,
) {
  const registry = registryOverride ?? GENERIC_DESCRIPTORS
  const descriptor = registry[serviceKey]
  const spec = specFor(descriptor, op)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      if (!spec) throw new OperationNotSupportedError(serviceKey, op)
      const buildInput = specToBuildInput(spec, input)
      switch (buildInput.adapter) {
        case 'aws-json':
          return awsJsonCall({
            target: buildInput.target,
            credentialScope: buildInput.credentialScope,
            body: buildInput.body as object,
          })
        case 'aws-query':
          return awsQueryCall({
            action: buildInput.action,
            version: buildInput.version,
            credentialScope: buildInput.credentialScope,
            params: buildInput.params,
          })
        case 'rest':
          return restCall({
            method: buildInput.method,
            path: buildInput.path,
            credentialScope: buildInput.credentialScope,
            body: buildInput.body,
          })
      }
    },
    // Pitfall C-3: single invalidate at the closest ancestor (list key).
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: genericKeys.list(serviceKey) })
    },
  })

  // Pitfall 7.2.6 / D-07: preview and send share one BuildInput pipeline.
  const preview = (input: Record<string, unknown>) => {
    if (!spec) throw new OperationNotSupportedError(serviceKey, op)
    return buildRequest(specToBuildInput(spec, input))
  }

  return {
    preview,
    send: mutation.mutate,
    sendAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    isSupported: !!spec,
  }
}
