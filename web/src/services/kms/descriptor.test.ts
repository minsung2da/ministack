import { describe, it, expect } from 'vitest'
import { kmsDescriptor } from './index.descriptor'

describe('kms/descriptor', () => {
  it('serviceKey === kms', () => {
    expect(kmsDescriptor.serviceKey).toBe('kms')
  })

  it('list uses TrentService.ListKeys (historical prefix, not KMS.*)', () => {
    const ep = kmsDescriptor.list.endpoint
    if (ep.adapter !== 'aws-json') throw new Error('expected aws-json')
    expect(ep.target).toBe('TrentService.ListKeys')
  })

  it('detail uses TrentService.DescribeKey', () => {
    const ep = kmsDescriptor.detail!.endpoint
    if (ep.adapter !== 'aws-json') throw new Error('expected aws-json')
    expect(ep.target).toBe('TrentService.DescribeKey')
  })

  it('no mutations field (D-02 read-only)', () => {
    expect(kmsDescriptor.mutations).toBeUndefined()
  })
})
