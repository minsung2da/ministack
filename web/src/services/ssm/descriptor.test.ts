import { describe, it, expect } from 'vitest'
import { ssmDescriptor } from './index.descriptor'

describe('ssm/descriptor', () => {
  it('serviceKey === ssm', () => {
    expect(ssmDescriptor.serviceKey).toBe('ssm')
  })

  it('list uses AmazonSSM.DescribeParameters', () => {
    const ep = ssmDescriptor.list.endpoint
    if (ep.adapter !== 'aws-json') throw new Error('expected aws-json')
    expect(ep.target).toBe('AmazonSSM.DescribeParameters')
  })

  it('detail sends WithDecryption: false (Pitfall 7.2.11)', () => {
    const ep = ssmDescriptor.detail!.endpoint
    if (ep.adapter !== 'aws-json') throw new Error('expected aws-json')
    const body = ep.buildBody('param-x') as Record<string, unknown>
    expect(body.WithDecryption).toBe(false)
  })

  it('detail.maskFields includes Value (D-08)', () => {
    expect(ssmDescriptor.detail?.maskFields).toContain('Value')
  })

  it('mutations.delete present; NO update (D-11)', () => {
    expect(ssmDescriptor.mutations?.delete).toBeDefined()
    expect(
      (ssmDescriptor.mutations as Record<string, unknown>).update,
    ).toBeUndefined()
  })
})
