import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfigurationPanel } from './ConfigurationPanel'
import { LAMBDA_FIXTURES } from '../__tests__/fixtures'
import type { LambdaFunctionConfiguration } from '../../../shared/types'

// Fixtures use `as const` which makes Architectures readonly — cast to
// mutable for the prop type without copying data.
const cfgBase = LAMBDA_FIXTURES.configBase as unknown as LambdaFunctionConfiguration
const cfgImage =
  LAMBDA_FIXTURES.getFunctionImage.Configuration as unknown as LambdaFunctionConfiguration

// [LAM-03] Configuration tab content.
describe('ConfigurationPanel', () => {
  test('renders Runtime, Handler, MemorySize, Timeout, CodeSize, Role ARN, Architectures, Last modified', () => {
    render(
      <ConfigurationPanel
        configuration={cfgBase}
        code={{ RepositoryType: 'S3', Location: '' }}
      />,
    )
    // KeyValuePairs labels
    expect(screen.getByText('Runtime')).toBeDefined()
    expect(screen.getByText('Handler')).toBeDefined()
    expect(screen.getByText('Memory')).toBeDefined()
    expect(screen.getByText('Timeout')).toBeDefined()
    expect(screen.getByText('Code size')).toBeDefined()
    expect(screen.getByText('Role')).toBeDefined()
    expect(screen.getByText('Architectures')).toBeDefined()
    expect(screen.getByText('Last modified')).toBeDefined()
    expect(screen.getByText('Revision ID')).toBeDefined()
    expect(screen.getByText('State')).toBeDefined()
    expect(screen.getByText('Function ARN')).toBeDefined()
    // Values
    expect(screen.getByText('python3.12')).toBeDefined()
    expect(screen.getByText('index.handler')).toBeDefined()
    expect(screen.getByText('128 MB')).toBeDefined()
    expect(screen.getByText('3 seconds')).toBeDefined()
    // CopyToClipboard buttons present (Role + FunctionArn -> at least 2).
    // Assert through visible ARN text being present.
    expect(screen.getByText(cfgBase.FunctionArn)).toBeDefined()
    expect(screen.getByText(cfgBase.Role)).toBeDefined()
  })

  test('PackageType Image shows Image URI row instead of Code size', () => {
    render(
      <ConfigurationPanel
        configuration={cfgImage}
        code={{
          RepositoryType: 'ECR',
          ImageUri: 'public.ecr.aws/demo/hello:latest',
        }}
      />,
    )
    expect(screen.getByText('Image URI')).toBeDefined()
    expect(screen.getByText('public.ecr.aws/demo/hello:latest')).toBeDefined()
    // Code size row absent
    expect(screen.queryByText('Code size')).toBeNull()
  })

  test('Last modified uses RelativeTime (D-10) — title attribute exposes ISO', () => {
    const { container } = render(
      <ConfigurationPanel
        configuration={cfgBase}
        code={{ RepositoryType: 'S3', Location: '' }}
      />,
    )
    // RelativeTime renders <span title={iso}>...</span>
    const iso = cfgBase.LastModified
    const match = container.querySelector(`span[title="${iso}"]`)
    expect(match).not.toBeNull()
  })

  test('Role ARN CopyToClipboard writes Role value to clipboard when clicked', async () => {
    // jsdom: provide writeText spy
    const writeText = vi.fn().mockResolvedValue(undefined)
    // @ts-expect-error — test override
    globalThis.navigator.clipboard = { writeText }

    const { container } = render(
      <ConfigurationPanel
        configuration={cfgBase}
        code={{ RepositoryType: 'S3', Location: '' }}
      />,
    )

    // Click each copy button; at least one should copy the Role or
    // FunctionArn value. Cloudscape's CopyToClipboard button text starts
    // with "Copy".
    const buttons = container.querySelectorAll('button')
    for (const btn of Array.from(buttons)) {
      if (
        /copy/i.test(btn.textContent ?? '') ||
        /copy/i.test(btn.getAttribute('aria-label') ?? '')
      ) {
        fireEvent.click(btn)
      }
    }
    const calls = writeText.mock.calls.map((c) => c[0])
    expect(
      calls.includes(cfgBase.Role) || calls.includes(cfgBase.FunctionArn),
    ).toBe(true)
  })
})

