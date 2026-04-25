import { useQuery } from '@tanstack/react-query'
import { GENERIC_DESCRIPTORS } from '../registry'
import { genericKeys } from '../keys'
import { awsJsonCall } from '../adapters/awsJson'
import { awsQueryCall } from '../adapters/awsQuery'
import { restCall } from '../adapters/rest'
import type { ServiceDescriptor } from '../types'

/**
 * useDescriptorList — generic list hook dispatched by descriptor.list.endpoint.
 *
 * Accepts an optional `registryOverride` so tests can inject an inline
 * descriptor without polluting the real registry.
 *
 * Singleton descriptors (STS — Pitfall 7.2.7) have no list, so the query is
 * disabled; `useDescriptorItem` handles them instead.
 */
export function useDescriptorList<Row = unknown>(
  serviceKey: string,
  registryOverride?: Record<string, ServiceDescriptor>,
) {
  const registry = registryOverride ?? GENERIC_DESCRIPTORS
  const descriptor = registry[serviceKey]
  return useQuery<Row[]>({
    queryKey: genericKeys.list(serviceKey),
    queryFn: async () => {
      if (!descriptor) throw new Error(`Unknown service: ${serviceKey}`)
      const ep = descriptor.list.endpoint
      let raw: unknown
      switch (ep.adapter) {
        case 'aws-json':
          raw = await awsJsonCall({
            target: ep.target,
            credentialScope: ep.credentialScope,
            body: ep.defaultBody ?? {},
          })
          break
        case 'aws-query':
          raw = await awsQueryCall({
            action: ep.action,
            version: ep.version,
            credentialScope: ep.credentialScope,
            params: ep.defaultParams ?? {},
          })
          break
        case 'rest':
          raw = await restCall({
            method: ep.method,
            path: ep.path,
            credentialScope: ep.credentialScope,
          })
          break
      }
      return descriptor.list.parseResponse(raw) as Row[]
    },
    // kind: 'singleton' has no list — routing via useDescriptorItem.
    enabled: !!descriptor && descriptor.kind !== 'singleton',
  })
}
