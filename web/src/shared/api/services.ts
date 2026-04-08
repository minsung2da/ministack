import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { apiClient } from './client'
import type { Service } from '../types'

async function fetchServices(): Promise<Service[]> {
  const data = await apiClient.get('/_console/api/services').json<unknown>()
  if (!Array.isArray(data)) {
    throw new Error('Invalid /_console/api/services response: expected array')
  }
  // Minimal runtime validation — registry is server-controlled, full zod is overkill
  return data.map((entry) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof (entry as { key?: unknown }).key !== 'string' ||
      typeof (entry as { name?: unknown }).name !== 'string' ||
      typeof (entry as { category?: unknown }).category !== 'string'
    ) {
      throw new Error('Invalid service registry entry')
    }
    return entry as Service
  })
}

export function useServices(): UseQueryResult<Service[], Error> {
  return useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    staleTime: 5 * 60_000, // registry is nearly static — refetch every 5min
  })
}
