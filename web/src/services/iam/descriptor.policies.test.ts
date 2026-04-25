import { describe, it, expect } from 'vitest'
import { iamPoliciesDescriptor } from './policies.descriptor'

const sampleXml = `<ListPoliciesResponse>
  <ListPoliciesResult>
    <Policies>
      <member>
        <PolicyName>app-policy</PolicyName>
        <PolicyId>PID000</PolicyId>
        <Arn>arn:aws:iam::000000000000:policy/app-policy</Arn>
        <Path>/</Path>
        <AttachmentCount>1</AttachmentCount>
        <CreateDate>2026-01-01T00:00:00Z</CreateDate>
      </member>
    </Policies>
  </ListPoliciesResult>
</ListPoliciesResponse>`

describe('iam/policies.descriptor', () => {
  it('serviceKey === iam.policies (D-09)', () => {
    expect(iamPoliciesDescriptor.serviceKey).toBe('iam.policies')
  })

  it('list.parseResponse surfaces PolicyName, Arn, AttachmentCount', () => {
    const rows = iamPoliciesDescriptor.list.parseResponse(sampleXml)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.PolicyName).toBe('app-policy')
    expect(rows[0]?.Arn).toContain('app-policy')
    expect(rows[0]?.AttachmentCount).toBe('1')
  })
})
