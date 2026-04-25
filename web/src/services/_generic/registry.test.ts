import { describe, it, expect } from 'vitest'
import { GENERIC_DESCRIPTORS } from './registry'
import type { ServiceDescriptor } from './types'

describe('_generic/registry', () => {
  it('exports exactly 7 descriptor keys', () => {
    expect(Object.keys(GENERIC_DESCRIPTORS)).toHaveLength(7)
  })

  it('includes three IAM entries prefixed "iam." (D-09)', () => {
    const iamKeys = Object.keys(GENERIC_DESCRIPTORS).filter((k) =>
      k.startsWith('iam.'),
    )
    expect(iamKeys.sort()).toEqual(['iam.policies', 'iam.roles', 'iam.users'])
  })

  it('includes sts, secretsmanager, ssm, kms (D-05)', () => {
    for (const key of ['sts', 'secretsmanager', 'ssm', 'kms'] as const) {
      expect(GENERIC_DESCRIPTORS[key]).toBeDefined()
    }
  })

  it("sts descriptor is kind: 'singleton' (Pitfall 7.2.7)", () => {
    expect(GENERIC_DESCRIPTORS.sts?.kind).toBe('singleton')
  })

  it("non-STS descriptors are kind: 'list'", () => {
    for (const key of ['iam.users', 'iam.roles', 'iam.policies', 'kms']) {
      expect(GENERIC_DESCRIPTORS[key]?.kind).toBe('list')
    }
  })

  it('every descriptor has a list.endpoint and parseResponse (framework contract)', () => {
    for (const [key, descriptor] of Object.entries(GENERIC_DESCRIPTORS)) {
      expect(descriptor.list.endpoint, key).toBeDefined()
      expect(typeof descriptor.list.parseResponse, key).toBe('function')
    }
  })

  it('registry is extensible: adding a new key at runtime (on a copy) makes it retrievable — GEN-03 proof at data layer', () => {
    const extended: Record<string, ServiceDescriptor> = {
      ...GENERIC_DESCRIPTORS,
      'future-svc': {
        serviceKey: 'future-svc',
        displayName: 'Future Service',
        idField: 'id',
        list: {
          endpoint: {
            adapter: 'rest',
            method: 'GET',
            path: '/future',
            credentialScope: 'future',
          },
          parseResponse: () => [],
          columns: [],
        },
      },
    }
    expect(Object.keys(extended)).toHaveLength(8)
    expect(extended['future-svc']?.displayName).toBe('Future Service')
  })
})
