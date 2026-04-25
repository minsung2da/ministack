import { useQuery } from '@tanstack/react-query'
import { GENERIC_DESCRIPTORS } from '../registry'
import { genericKeys } from '../keys'
import { awsJsonCall } from '../adapters/awsJson'
import { awsQueryCall } from '../adapters/awsQuery'
import { restCall } from '../adapters/rest'
import type { ServiceDescriptor } from '../types'

/**
 * useDescriptorItem — generic detail hook.
 *
 * For `kind: 'singleton'` (STS), the caller passes an empty id and the query
 * still fires on mount — the endpoint's buildBody/Params/Path ignores the id.
 * Non-singleton descriptors require a non-empty id to enable the query.
 */
export function useDescriptorItem<Row = Record<string, unknown>>(
  serviceKey: string,
  id: string,
  registryOverride?: Record<string, ServiceDescriptor>,
) {
  const registry = registryOverride ?? GENERIC_DESCRIPTORS
  const descriptor = registry[serviceKey]
  return useQuery<Row>({
    queryKey: genericKeys.item(serviceKey, id),
    queryFn: async () => {
      if (!descriptor?.detail) {
        throw new Error(`No detail endpoint for ${serviceKey}`)
      }
      const ep = descriptor.detail.endpoint
      let raw: unknown
      switch (ep.adapter) {
        case 'aws-json':
          raw = await awsJsonCall({
            target: ep.target,
            credentialScope: ep.credentialScope,
            body: ep.buildBody(id),
          })
          break
        case 'aws-query':
          raw = await awsQueryCall({
            action: ep.action,
            version: ep.version,
            credentialScope: ep.credentialScope,
            params: ep.buildParams(id),
          })
          break
        case 'rest':
          raw = await restCall({
            method: ep.method,
            path: ep.buildPath(id),
            credentialScope: ep.credentialScope,
          })
          break
      }
      return descriptor.detail.parseResponse(raw) as Row
    },
    enabled:
      !!descriptor?.detail &&
      (descriptor.kind === 'singleton' || !!id),
  })
}
