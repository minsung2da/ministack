/**
 * Lambda JSON fixtures (Phase 4 Plan 00 bootstrap — created by Plan 01 executor
 * because Plan 00 was not run on this worktree base; Rule 3 bootstrap).
 *
 * All fixtures are plain JS objects (not XML strings) — mirrors
 * ministack/services/lambda_svc.py `_build_config` and `_invoke` shapes per
 * RESEARCH §Backend REST Inventory.
 */

const configBase = {
  FunctionName: 'hello',
  FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:hello',
  Runtime: 'python3.12',
  Handler: 'index.handler',
  CodeSize: 1234,
  Description: '',
  Timeout: 3,
  MemorySize: 128,
  LastModified: '2026-04-17T10:30:00Z',
  Version: '$LATEST',
  Role: 'arn:aws:iam::000000000000:role/lambda-role',
  State: 'Active',
  LastUpdateStatus: 'Successful',
  PackageType: 'Zip' as const,
  Architectures: ['x86_64'] as const,
  Environment: { Variables: { LOG_LEVEL: 'info', API_KEY: 'abc123' } },
  Layers: [] as { Arn: string }[],
  TracingConfig: { Mode: 'PassThrough' as const },
  RevisionId: '00000000-0000-0000-0000-000000000000',
  EphemeralStorage: { Size: 512 },
  LoggingConfig: { LogFormat: 'Text', LogGroup: '/aws/lambda/hello' },
}

const goodbyeConfig = {
  ...configBase,
  FunctionName: 'goodbye',
  FunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:goodbye',
  Runtime: 'nodejs20.x',
  LastModified: '2026-04-15T08:00:00Z',
}

// Pre-computed base64 of 'START RequestId: abc\n안녕 from Lambda\nEND RequestId: abc\n'
// Contains Korean multi-byte UTF-8 bytes — exercises Pitfall 1 decoding.
const invokeSuccessLogText =
  'START RequestId: abc\n안녕 from Lambda\nEND RequestId: abc\n'
const invokeErrorLogText =
  'START RequestId: xyz\nERROR division by zero\nEND RequestId: xyz\n'

function textToBase64(text: string): string {
  // UTF-8 encode then base64 — matches backend `base64.b64encode(text.encode())`.
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export const LAMBDA_FIXTURES = {
  configBase,
  listFunctionsEmpty: { Functions: [] },
  listFunctionsTwo: { Functions: [configBase, goodbyeConfig] },
  listFunctionsTruncated: { Functions: [configBase], NextMarker: 'hello' },
  getFunctionHello: {
    Configuration: configBase,
    Code: { RepositoryType: 'S3', Location: '' },
    Tags: { team: 'platform' },
  },
  getFunctionImage: {
    Configuration: { ...configBase, PackageType: 'Image' as const },
    Code: {
      RepositoryType: 'ECR',
      ImageUri: 'public.ecr.aws/demo/hello:latest',
    },
    Tags: {},
  },
  createFunctionResponse: { ...configBase, FunctionName: 'new-func' },
  updateConfigResponse: { ...configBase, Timeout: 30, MemorySize: 512 },
  invokeSuccessBody: '{"statusCode":200,"body":"hello world"}',
  invokeSuccessLogBase64: textToBase64(invokeSuccessLogText),
  invokeSuccessLogText,
  invokeErrorBody:
    '{"errorMessage":"division by zero","errorType":"Runtime.HandlerError"}',
  invokeErrorLogBase64: textToBase64(invokeErrorLogText),
  invokeErrorLogText,
  esmsEmpty: { EventSourceMappings: [] },
  esmsOne: {
    EventSourceMappings: [
      {
        UUID: '11111111-2222-3333-4444-555555555555',
        FunctionArn: configBase.FunctionArn,
        FunctionName: 'hello',
        EventSourceArn: 'arn:aws:sqs:us-east-1:000000000000:my-queue',
        State: 'Enabled',
        Enabled: true,
        BatchSize: 10,
        LastModified: 1713360000.0,
        LastProcessingResult: 'OK',
      },
    ],
  },
  functionUrlEmpty: { FunctionUrlConfigs: [] },
  functionUrlOne: {
    FunctionUrlConfigs: [
      {
        FunctionUrl: 'https://abcdef.lambda-url.us-east-1.on.aws/',
        FunctionArn: configBase.FunctionArn,
        AuthType: 'NONE',
        Cors: {},
        CreationTime: '2026-04-17T10:30:00Z',
        LastModifiedTime: '2026-04-17T10:30:00Z',
      },
    ],
  },
} as const
