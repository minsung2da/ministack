import type { ServiceDescriptor } from '../_generic/types'
import {
  parseXml,
  selectText,
} from '../_generic/components/xmlUtils'

/**
 * STS descriptor — SINGLETON (Pitfall 7.2.7).
 * Only surface is GetCallerIdentity; GenericRouter dispatches directly to
 * GenericDetailPanel and never mounts a list view.
 */
export const stsDescriptor: ServiceDescriptor = {
  serviceKey: 'sts',
  displayName: 'STS',
  kind: 'singleton',
  idField: 'Account',
  list: {
    // Singleton — list endpoint is a synthetic no-op per <behavior>. The hook
    // short-circuits because kind === 'singleton' (see useGenericList).
    endpoint: {
      adapter: 'aws-query',
      action: 'GetCallerIdentity',
      version: '2011-06-15',
      credentialScope: 'sts',
    },
    parseResponse: () => [],
    columns: [],
  },
  detail: {
    endpoint: {
      adapter: 'aws-query',
      action: 'GetCallerIdentity',
      version: '2011-06-15',
      credentialScope: 'sts',
      buildParams: () => ({}),
    },
    parseResponse: (raw) => {
      const doc = parseXml(raw as string)
      const r = doc.getElementsByTagName('GetCallerIdentityResult')[0]
      if (!r) return {}
      return {
        Arn: selectText(r, 'Arn'),
        UserId: selectText(r, 'UserId'),
        Account: selectText(r, 'Account'),
      }
    },
  },
  // NO mutations — STS is query-only (D-02 / D-11).
}
