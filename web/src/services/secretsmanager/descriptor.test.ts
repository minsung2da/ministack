import { describe, it, expect } from 'vitest'
import { secretsDescriptor } from './index.descriptor'

describe('secretsmanager/descriptor', () => {
  it('serviceKey === secretsmanager', () => {
    expect(secretsDescriptor.serviceKey).toBe('secretsmanager')
  })

  it('list uses secretsmanager.ListSecrets (lowercase prefix)', () => {
    const ep = secretsDescriptor.list.endpoint
    if (ep.adapter !== 'aws-json') throw new Error('expected aws-json')
    expect(ep.target).toBe('secretsmanager.ListSecrets')
  })

  it('detail.maskFields includes SecretString and SecretBinary (D-08)', () => {
    expect(secretsDescriptor.detail?.maskFields).toContain('SecretString')
    expect(secretsDescriptor.detail?.maskFields).toContain('SecretBinary')
  })

  it('mutations.create + mutations.delete present; NO update (D-11)', () => {
    expect(secretsDescriptor.mutations?.create).toBeDefined()
    expect(secretsDescriptor.mutations?.delete).toBeDefined()
    expect(
      (secretsDescriptor.mutations as Record<string, unknown>).update,
    ).toBeUndefined()
  })
})
