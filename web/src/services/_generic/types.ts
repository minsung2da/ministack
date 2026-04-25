import type { ReactNode } from 'react'

/**
 * Generic service framework types (Phase 5, Plan 01).
 *
 * Per-service behavior is authored as a `ServiceDescriptor` TS module
 * (D-01). This file locks the contract every descriptor and the generic
 * UI (GenericListPage, GenericDetailPanel, Create/Delete modals in later
 * plans) consumes.
 *
 * Two discriminants:
 *   - `adapter`: 'rest' | 'aws-json' | 'aws-query' — selects transport
 *   - `kind`:    'list' | 'singleton'              — STS is the only
 *                 singleton; everything else is a list (Pitfall 7.2.7).
 */

export type Adapter = 'rest' | 'aws-json' | 'aws-query'

export type ColumnDefinition<Row = unknown> = {
  id: string
  header: string
  cell: (row: Row) => ReactNode
  sortingField?: string
  width?: number
}

export type ListEndpoint =
  | {
      adapter: 'aws-json'
      target: string
      credentialScope: string
      defaultBody?: Record<string, unknown>
    }
  | {
      adapter: 'aws-query'
      action: string
      version: string
      credentialScope: string
      defaultParams?: Record<string, string>
    }
  | {
      adapter: 'rest'
      method: 'GET' | 'POST'
      path: string
      credentialScope: string
    }

export type DetailEndpoint =
  | {
      adapter: 'aws-json'
      target: string
      credentialScope: string
      buildBody: (id: string) => object
    }
  | {
      adapter: 'aws-query'
      action: string
      version: string
      credentialScope: string
      buildParams: (id: string) => Record<string, string>
    }
  | {
      adapter: 'rest'
      method: 'GET' | 'POST'
      credentialScope: string
      buildPath: (id: string) => string
    }

export type JsonBodyShape = {
  fields: Array<{
    name: string
    kind: 'string' | 'number' | 'boolean' | 'json'
    required: boolean
    label: string
    placeholder?: string
  }>
}

export type MutationSpec =
  | {
      adapter: 'aws-json'
      target: string
      credentialScope: string
      bodyShape: JsonBodyShape
    }
  | {
      adapter: 'aws-query'
      action: string
      version: string
      credentialScope: string
      paramShape: JsonBodyShape
    }
  | {
      adapter: 'rest'
      method: 'POST' | 'PUT' | 'DELETE'
      path: string
      credentialScope: string
      bodyShape?: JsonBodyShape
    }

export type ServiceDescriptor<Row = Record<string, unknown>> = {
  serviceKey: string
  displayName: string
  kind?: 'list' | 'singleton' // default 'list'; 'singleton' = STS (Pitfall 7.2.7)
  idField: string
  list: {
    endpoint: ListEndpoint
    parseResponse: (raw: unknown) => Row[]
    columns: ColumnDefinition<Row>[]
    emptyStateCopy?: { title: string; subtitle: string }
  }
  detail?: {
    endpoint: DetailEndpoint
    parseResponse: (raw: unknown) => Record<string, unknown>
    /**
     * D-08: fields whose values are masked by default in GenericDetailPanel.
     * Each listed key renders `••••••••` with a per-field Reveal/Hide toggle.
     */
    maskFields?: string[]
  }
  mutations?: {
    create?: MutationSpec & { successFlashbar: string }
    delete?: {
      endpoint: MutationSpec
      typeToConfirmField: string
      successFlashbar: string
    }
  }
}
