import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { FunctionTable } from './FunctionTable'
import type { LambdaFunctionSummary } from '../../../shared/types'

function wrap(ui: ReactNode) {
  return <MemoryRouter initialEntries={['/services/lambda']}>{ui}</MemoryRouter>
}

const BASE: LambdaFunctionSummary = {
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
  PackageType: 'Zip',
  Architectures: ['x86_64'],
  Environment: { Variables: {} },
  Layers: [],
  RevisionId: 'r',
}

const SAMPLE: LambdaFunctionSummary[] = [
  BASE,
  { ...BASE, FunctionName: 'goodbye', Runtime: 'nodejs20.x' },
]

function defaultProps(over: Partial<React.ComponentProps<typeof FunctionTable>> = {}) {
  return {
    functions: SAMPLE,
    isLoading: false,
    error: null,
    marker: null,
    nextMarker: null,
    selected: null,
    onRefresh: vi.fn(),
    onCreate: vi.fn(),
    onDelete: vi.fn(),
    onMarkerChange: vi.fn(),
    onSelectionChange: vi.fn(),
    ...over,
  }
}

describe('FunctionTable [LAM-01]', () => {
  test('renders function name as Link navigating to /services/lambda/{name}', () => {
    render(wrap(<FunctionTable {...defaultProps()} />))
    const link = screen.getByRole('link', { name: 'hello' })
    expect(link).toHaveAttribute('href', '/services/lambda/hello')
  })

  test('renders Runtime, Handler columns with expected cell contents', () => {
    render(wrap(<FunctionTable {...defaultProps()} />))
    expect(screen.getByText('python3.12')).toBeDefined()
    expect(screen.getByText('nodejs20.x')).toBeDefined()
    // Handler column should appear in the body
    expect(screen.getAllByText('index.handler').length).toBeGreaterThan(0)
  })

  test('Last modified column renders via RelativeTime (title attribute is the ISO)', () => {
    render(wrap(<FunctionTable {...defaultProps()} />))
    // Both rows share the same LastModified — expect at least one cell whose title matches
    const cells = document.querySelectorAll(
      `span[title="2026-04-17T10:30:00Z"]`,
    )
    expect(cells.length).toBeGreaterThanOrEqual(2)
  })

  test('empty-state body matches copy.lambda.functionsEmptyBody', () => {
    render(wrap(<FunctionTable {...defaultProps({ functions: [] })} />))
    expect(
      screen.getByText(/Create your first Lambda function to get started/i),
    ).toBeDefined()
  })

  test('load-error Alert shows Retry button that calls onRefresh', () => {
    const onRefresh = vi.fn()
    render(
      wrap(
        <FunctionTable
          {...defaultProps({ error: new Error('boom'), onRefresh })}
        />,
      ),
    )
    expect(screen.getByText('Could not load functions')).toBeDefined()
    const retry = screen.getByRole('button', { name: 'Retry' })
    fireEvent.click(retry)
    expect(onRefresh).toHaveBeenCalled()
  })

  test('Create button in header fires onCreate', () => {
    const onCreate = vi.fn()
    render(wrap(<FunctionTable {...defaultProps({ onCreate })} />))
    fireEvent.click(screen.getByRole('button', { name: 'Create function' }))
    expect(onCreate).toHaveBeenCalled()
  })

  test('Prev disabled on page 1, Next disabled when no nextMarker', () => {
    render(wrap(<FunctionTable {...defaultProps()} />))
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  test('Next enabled when nextMarker present, calls onMarkerChange', () => {
    const onMarkerChange = vi.fn()
    render(
      wrap(
        <FunctionTable
          {...defaultProps({ nextMarker: 'page-2', onMarkerChange })}
        />,
      ),
    )
    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).not.toBeDisabled()
    fireEvent.click(next)
    expect(onMarkerChange).toHaveBeenCalledWith('page-2')
  })
})
