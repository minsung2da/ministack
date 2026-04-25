import { describe, it, expect } from 'vitest'
import { iamUsersDescriptor } from './users.descriptor'

const sampleXml = `<ListUsersResponse>
  <ListUsersResult>
    <Users>
      <member>
        <UserName>alice</UserName>
        <UserId>AID000</UserId>
        <Arn>arn:aws:iam::000000000000:user/alice</Arn>
        <Path>/</Path>
        <CreateDate>2026-01-01T00:00:00Z</CreateDate>
      </member>
    </Users>
  </ListUsersResult>
</ListUsersResponse>`

describe('iam/users.descriptor', () => {
  it('serviceKey === iam.users (D-09)', () => {
    expect(iamUsersDescriptor.serviceKey).toBe('iam.users')
  })

  it('list.parseResponse walks ListUsersResult > Users > member from XML', () => {
    const rows = iamUsersDescriptor.list.parseResponse(sampleXml)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.UserName).toBe('alice')
    expect(rows[0]?.Arn).toContain('alice')
  })

  it('mutations.delete.typeToConfirmField === UserName', () => {
    expect(iamUsersDescriptor.mutations?.delete?.typeToConfirmField).toBe(
      'UserName',
    )
  })

  it('D-11: no mutations.update', () => {
    expect(
      (iamUsersDescriptor.mutations as Record<string, unknown> | undefined)
        ?.update,
    ).toBeUndefined()
  })
})
