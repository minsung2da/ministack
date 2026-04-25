import { describe, it, expect } from 'vitest'
import { stsDescriptor } from './index.descriptor'

const sampleXml = `<GetCallerIdentityResponse>
  <GetCallerIdentityResult>
    <Arn>arn:aws:iam::000000000000:root</Arn>
    <UserId>AID000</UserId>
    <Account>000000000000</Account>
  </GetCallerIdentityResult>
</GetCallerIdentityResponse>`

describe('sts/descriptor', () => {
  it('serviceKey === sts', () => {
    expect(stsDescriptor.serviceKey).toBe('sts')
  })

  it('kind === singleton (Pitfall 7.2.7)', () => {
    expect(stsDescriptor.kind).toBe('singleton')
  })

  it('detail.parseResponse returns { Arn, UserId, Account }', () => {
    const out = stsDescriptor.detail!.parseResponse(sampleXml)
    expect(out.Arn).toContain('root')
    expect(out.UserId).toBe('AID000')
    expect(out.Account).toBe('000000000000')
  })

  it('no mutations (query-only / D-11)', () => {
    expect(stsDescriptor.mutations).toBeUndefined()
  })
})
