import { useParams } from 'react-router-dom'
import Alert from '@cloudscape-design/components/alert'
import { GENERIC_DESCRIPTORS } from './registry'
import { GenericListPage } from './GenericListPage'
import { GenericDetailPanel } from './GenericDetailPanel'
import { copy } from '../../shared/copy'

/**
 * GenericRouter — single entry for all descriptor-driven service routes.
 *
 * Resolves `:serviceKey` from useParams(), looks up descriptor in
 * GENERIC_DESCRIPTORS, and dispatches by `kind`:
 *
 *   - kind === 'singleton'  → GenericDetailPanel (STS only — Pitfall 7.2.7)
 *   - kind === 'list' (default):
 *       - `:id` present  → GenericDetailPanel
 *       - else           → GenericListPage
 */
export default function GenericRouter({
  serviceKey: propKey,
}: { serviceKey?: string } = {}) {
  const params = useParams<{ serviceKey?: string; id?: string }>()
  const serviceKey = propKey ?? params.serviceKey ?? ''
  const id = params.id
  const descriptor = GENERIC_DESCRIPTORS[serviceKey]

  if (!descriptor) {
    return (
      <Alert type="error" header="Unknown service">
        {copy.generic.unknownService(serviceKey)}
      </Alert>
    )
  }

  if (descriptor.kind === 'singleton') {
    return <GenericDetailPanel descriptor={descriptor} id={null} />
  }

  if (id) {
    return <GenericDetailPanel descriptor={descriptor} id={id} />
  }

  return <GenericListPage descriptor={descriptor} />
}
