/**
 * IAM aws-query XML fixtures (Phase 5 Wave 0).
 *
 * Sourced verbatim from 05-RESEARCH.md §9.8.
 *
 * Protocol notes:
 * - Backend expects form-encoded POST to `/` with Action=... in body.
 * - Responses are XML strings (DOMParser-parseable).
 * - Collection shape: <Root><Collection><member>...</member></Collection></Root>.
 */

const listUsersXml = `<?xml version="1.0"?>
<ListUsersResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
 <ListUsersResult>
  <Users>
   <member>
    <UserName>alice</UserName>
    <UserId>AIDAALICE00000000</UserId>
    <Arn>arn:aws:iam::000000000000:user/alice</Arn>
    <Path>/</Path>
    <CreateDate>2026-04-10T00:00:00Z</CreateDate>
   </member>
   <member>
    <UserName>bob</UserName>
    <UserId>AIDABOB00000000000</UserId>
    <Arn>arn:aws:iam::000000000000:user/bob</Arn>
    <Path>/</Path>
    <CreateDate>2026-04-11T00:00:00Z</CreateDate>
   </member>
  </Users>
  <IsTruncated>false</IsTruncated>
 </ListUsersResult>
</ListUsersResponse>`

const listUsersEmptyXml = `<?xml version="1.0"?>
<ListUsersResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
 <ListUsersResult>
  <Users></Users>
  <IsTruncated>false</IsTruncated>
 </ListUsersResult>
</ListUsersResponse>`

const listRolesXml = `<?xml version="1.0"?>
<ListRolesResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
 <ListRolesResult>
  <Roles>
   <member>
    <RoleName>ops-role</RoleName>
    <RoleId>AROA0000000000000000</RoleId>
    <Arn>arn:aws:iam::000000000000:role/ops-role</Arn>
    <Path>/</Path>
    <CreateDate>2026-04-10T00:00:00Z</CreateDate>
   </member>
  </Roles>
  <IsTruncated>false</IsTruncated>
 </ListRolesResult>
</ListRolesResponse>`

const listPoliciesXml = `<?xml version="1.0"?>
<ListPoliciesResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
 <ListPoliciesResult>
  <Policies>
   <member>
    <PolicyName>ReadOnly</PolicyName>
    <PolicyId>ANPA0000000000000000</PolicyId>
    <Arn>arn:aws:iam::000000000000:policy/ReadOnly</Arn>
    <Path>/</Path>
    <DefaultVersionId>v1</DefaultVersionId>
    <AttachmentCount>3</AttachmentCount>
    <CreateDate>2026-04-09T00:00:00Z</CreateDate>
   </member>
  </Policies>
  <IsTruncated>false</IsTruncated>
 </ListPoliciesResult>
</ListPoliciesResponse>`

const getUserXml = `<?xml version="1.0"?>
<GetUserResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
 <GetUserResult>
  <User>
   <UserName>alice</UserName>
   <UserId>AIDAALICE00000000</UserId>
   <Arn>arn:aws:iam::000000000000:user/alice</Arn>
   <Path>/</Path>
   <CreateDate>2026-04-10T00:00:00Z</CreateDate>
  </User>
 </GetUserResult>
</GetUserResponse>`

export const IAM_FIXTURES = {
  listUsersXml,
  listUsersEmptyXml,
  listRolesXml,
  listPoliciesXml,
  getUserXml,
} as const
