import { describe, it, expect } from 'vitest'
import { parseXml, selectText, selectMembers } from './components/xmlUtils'

describe('_generic/xmlUtils', () => {
  it('parseXml rejects malformed XML', () => {
    expect(() => parseXml('<not-closed>')).toThrow(/XML parse error/)
  })

  it('selectText reads a simple child element by tag', () => {
    const doc = parseXml('<Root><Arn>arn:aws:iam::000000000000:user/x</Arn></Root>')
    expect(selectText(doc.documentElement, 'Arn')).toBe(
      'arn:aws:iam::000000000000:user/x',
    )
  })

  it('selectMembers walks Result/Collection/member and extracts listed fields', () => {
    const xml = `<ListUsersResponse>
      <ListUsersResult>
        <Users>
          <member>
            <UserName>alice</UserName>
            <UserId>AID000</UserId>
            <Arn>arn:aws:iam::000:user/alice</Arn>
            <Path>/</Path>
            <CreateDate>2026-01-01T00:00:00Z</CreateDate>
          </member>
          <member>
            <UserName>bob</UserName>
            <UserId>AID001</UserId>
            <Arn>arn:aws:iam::000:user/bob</Arn>
            <Path>/</Path>
            <CreateDate>2026-01-02T00:00:00Z</CreateDate>
          </member>
        </Users>
      </ListUsersResult>
    </ListUsersResponse>`
    const doc = parseXml(xml)
    const rows = selectMembers(doc, 'ListUsersResult', 'Users', [
      'UserName',
      'UserId',
      'Arn',
      'Path',
      'CreateDate',
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]?.UserName).toBe('alice')
    expect(rows[1]?.UserName).toBe('bob')
    expect(rows[0]?.Arn).toContain('alice')
  })

  it('selectMembers returns [] when collection empty or missing', () => {
    const doc = parseXml('<ListUsersResponse><ListUsersResult><Users/></ListUsersResult></ListUsersResponse>')
    expect(selectMembers(doc, 'ListUsersResult', 'Users', ['UserName'])).toEqual(
      [],
    )
  })
})
