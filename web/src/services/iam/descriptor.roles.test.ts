import { describe, it, expect } from 'vitest'
import { iamRolesDescriptor } from './roles.descriptor'

const sampleXml = `<ListRolesResponse>
  <ListRolesResult>
    <Roles>
      <member>
        <RoleName>lambda-exec</RoleName>
        <RoleId>RID000</RoleId>
        <Arn>arn:aws:iam::000000000000:role/lambda-exec</Arn>
        <Path>/</Path>
        <CreateDate>2026-01-01T00:00:00Z</CreateDate>
      </member>
    </Roles>
  </ListRolesResult>
</ListRolesResponse>`

describe('iam/roles.descriptor', () => {
  it('serviceKey === iam.roles (D-09)', () => {
    expect(iamRolesDescriptor.serviceKey).toBe('iam.roles')
  })

  it('list.parseResponse walks ListRolesResult > Roles > member', () => {
    const rows = iamRolesDescriptor.list.parseResponse(sampleXml)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.RoleName).toBe('lambda-exec')
  })

  it('mutations.delete.typeToConfirmField === RoleName', () => {
    expect(iamRolesDescriptor.mutations?.delete?.typeToConfirmField).toBe(
      'RoleName',
    )
  })
})
