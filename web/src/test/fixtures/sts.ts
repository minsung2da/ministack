/**
 * STS aws-query XML fixtures (Phase 5 Wave 0).
 *
 * Sourced verbatim from 05-RESEARCH.md §9.9.
 *
 * STS is modelled as a SINGLETON per D-05 / §5.2 — only GetCallerIdentity,
 * no list endpoint.
 */

const getCallerIdentityXml = `<?xml version="1.0"?>
<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
 <GetCallerIdentityResult>
  <Arn>arn:aws:iam::000000000000:root</Arn>
  <UserId>000000000000</UserId>
  <Account>000000000000</Account>
 </GetCallerIdentityResult>
</GetCallerIdentityResponse>`

export const STS_FIXTURES = {
  getCallerIdentityXml,
} as const
